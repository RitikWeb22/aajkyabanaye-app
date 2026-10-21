export interface GroceryItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  groceryTerm?: string;
  category?: string;
  note?: string;
  packQuantity?: number;
}

export interface PrepareShoppingMeta {
  recipeTitle?: string;
  servings?: number;
}

export interface PrepareShoppingResult {
  provider: string;
  type: 'copied' | 'deeplink' | 'cart_created';
  url?: string;
  text: string;
  itemCount: number;
  message: string;
  isConnected?: boolean;
  items?: Array<{
    name: string;
    quantity?: number;
    packQuantity?: number;
    unit?: string;
    groceryTerm?: string;
    searchUrl?: string;
    product?: any;
  }>;
  cartSummary?: {
    itemTotal: number;
    deliveryFee: number;
    grandTotal: number;
    etaMinutes: number;
    cartId?: string;
    handlingFee?: number;
    savings?: number;
    addressDetails?: any;
    billBreakdown?: any;
  };
}

export interface GroceryProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  prepare(items: GroceryItem[], meta?: PrepareShoppingMeta): Promise<PrepareShoppingResult>;
}
