import { GroceryItem, GroceryProvider, PrepareShoppingMeta, PrepareShoppingResult } from './types.js';
import { CopyListGroceryProvider } from './copyList.js';
import { swiggyMcp } from './swiggyMcpClient.js';

/**
 * Swiggy Instamart Grocery Provider (Official MCP)
 * 
 * Powered by Swiggy Builders Club Model Context Protocol:
 * Reference: https://mcp.swiggy.com/builders/docs/reference/instamart/
 * Endpoint: POST https://mcp.swiggy.com/im
 */
export class InstamartGroceryProvider implements GroceryProvider {
  id = 'instamart';
  name = 'Swiggy Instamart';
  private fallbackProvider = new CopyListGroceryProvider();

  isAvailable(): boolean {
    return true;
  }

  async prepare(
    items: GroceryItem[],
    meta?: PrepareShoppingMeta,
    userToken?: string
  ): Promise<PrepareShoppingResult> {
    const formattedText = (await this.fallbackProvider.prepare(items, meta)).text;
    const isConnected = Boolean(userToken || swiggyMcp.isConnected());

    const matchedItems: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      groceryTerm?: string;
      searchUrl: string;
      product?: any;
    }> = [];

    const cartItems: Array<{ spinId: string; quantity: number }> = [];

    let defaultAddress: { id: string; addressLine?: string; tag?: string; area?: string; name?: string } | null = null;
    if (isConnected) {
      try {
        defaultAddress = await swiggyMcp.getDefaultAddress(userToken);
      } catch (e) {
        console.warn('Could not resolve default address:', e);
      }
    }

    const targetAddressId = defaultAddress?.id;

    // 1. Process all selected items with live darkstore query
    const searchPromises = items.map(async (it) => {
      const query = it.groceryTerm || it.name;
      const searchUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
      let matchedProduct: any = null;

      if (isConnected && targetAddressId) {
        try {
          const found = await swiggyMcp.searchProducts(query, targetAddressId, userToken);
          if (found && found.length > 0) {
            matchedProduct = found[0];
            // Only verified items with non-empty genuine spinIds are eligible for cart
            if (matchedProduct.spinId && matchedProduct.spinId !== 'spin_default' && matchedProduct.spinId !== 'item') {
              const buyQty = typeof it.packQuantity === 'number' && it.packQuantity > 0
                ? Math.round(it.packQuantity)
                : 1;
              cartItems.push({
                spinId: matchedProduct.spinId,
                quantity: buyQty,
              });
            }
          }
        } catch (err) {
          console.warn(`Swiggy product search for "${query}" error:`, err);
        }
      }

      // If development mock mode is enabled explicitly and not connected or failed
      if (!matchedProduct && process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_GROCERY === 'true') {
        const cleanName = it.name;
        matchedProduct = {
          id: `mock_${encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, '_'))}`,
          name: `${cleanName} (Simulated Preview)`,
          brand: 'Simulated Darkstore (Dev Only)',
          price: 45,
          mrp: 55,
          weight: it.quantity && it.unit ? `${it.quantity} ${it.unit}` : '1 Pack',
          inStock: true,
          isMock: true,
        };
      }

      return {
        name: it.name,
        quantity: it.quantity,
        packQuantity: typeof it.packQuantity === 'number' && it.packQuantity > 0 ? it.packQuantity : 1,
        unit: it.unit,
        groceryTerm: query,
        searchUrl,
        product: matchedProduct || undefined,
      };
    });

    const settled = await Promise.allSettled(searchPromises);
    for (const res of settled) {
      if (res.status === 'fulfilled') {
        matchedItems.push(res.value);
      }
    }

    // 2. If user is connected and has valid cart items, attempt official Swiggy cart update
    let swiggyCartDetails: any = null;
    let cartUpdateError: string | null = null;

    if (isConnected && cartItems.length > 0 && targetAddressId) {
      try {
        const updateRes = await swiggyMcp.updateCart(cartItems, targetAddressId, userToken);
        if (updateRes.success) {
          swiggyCartDetails = updateRes;
        } else {
          cartUpdateError = updateRes.error || 'Cart update failed on Swiggy Instamart';
          console.warn('Swiggy Instamart update_cart notice:', cartUpdateError);
        }
      } catch (err: any) {
        cartUpdateError = err?.message || 'Swiggy MCP direct cart update error';
        console.warn('Swiggy MCP direct cart creation notice:', err);
      }
    }

    // Calculate totals based strictly on genuine matched products
    const itemsWithPrice = matchedItems.filter((i) => i.product && typeof i.product.price === 'number');
    const itemTotal = itemsWithPrice.reduce((sum, item: any) => sum + (item.product.price * (item.packQuantity || 1)), 0);
    const totalMrp = itemsWithPrice.reduce((sum, item: any) => sum + ((item.product.mrp || item.product.price) * (item.packQuantity || 1)), 0);
    const savings = Math.max(0, totalMrp - itemTotal);

    const deliveryFee = itemTotal >= 199 || itemTotal === 0 ? 0 : 25;
    const handlingFee = itemTotal > 0 ? 10 : 0;
    let grandTotal = itemTotal + (deliveryFee === 0 ? 0 : deliveryFee) + handlingFee;

    if (swiggyCartDetails?.cartTotalAmount) {
      const parsedTotal = parseInt(String(swiggyCartDetails.cartTotalAmount).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        grandTotal = parsedTotal;
      }
    }

    const cartSummary = {
      itemTotal,
      deliveryFee,
      grandTotal,
      etaMinutes: 12,
      cartId: swiggyCartDetails?.cartId,
      handlingFee,
      savings,
      addressDetails: swiggyCartDetails?.selectedAddressDetails || defaultAddress,
      billBreakdown: swiggyCartDetails?.billBreakdown,
    };

    // 3. P0 FIX: Only return type: 'cart_created' when Swiggy API genuinely created/updated the cart!
    if (isConnected && swiggyCartDetails && swiggyCartDetails.cartId) {
      return {
        provider: this.id,
        type: 'cart_created',
        url: 'https://www.swiggy.com/instamart',
        text: formattedText,
        itemCount: cartItems.length,
        isConnected: true,
        items: matchedItems,
        cartSummary,
        message: `🛒 ${cartItems.length} ingredients successfully added to your Swiggy Instamart cart.`,
      };
    }

    // 4. Honest fallback when cart could not be created or user is not connected
    const fallbackMessage = cartUpdateError
      ? `Could not auto-add to cart (${cartUpdateError}). You can open the items directly on Swiggy Instamart.`
      : isConnected
      ? `Items matched with Swiggy Instamart. Tap an item to search and add to your order.`
      : `Connect your Swiggy account for 1-tap cart creation, or use the direct search links below.`;

    return {
      provider: this.id,
      type: 'deeplink',
      url: 'https://www.swiggy.com/instamart',
      text: formattedText,
      itemCount: items.length,
      isConnected,
      items: matchedItems,
      cartSummary: itemTotal > 0 ? cartSummary : undefined,
      message: fallbackMessage,
    };
  }
}
