import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { GroceryList } from '../models/GroceryList.js';
import { inferCategory } from '../services/grocery/copyList.js';

export const groceryListsRouter = Router();

const groceryItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  purchased: z.boolean().optional(),
  sourceRecipeId: z.string().optional(),
  note: z.string().optional(),
});

const createGroceryListSchema = z.object({
  name: z.string().min(1).default('My Shopping List'),
  sourceRecipeIds: z.array(z.string()).optional(),
  items: z.array(groceryItemInputSchema).optional(),
});

const updateGroceryListSchema = z.object({
  name: z.string().min(1).optional(),
  items: z.array(groceryItemInputSchema).optional(),
});

/**
 * GET /me/grocery-lists
 * List all grocery lists for the authenticated user
 */
groceryListsRouter.get('/me/grocery-lists', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const lists = await GroceryList.find({ clerkUserId: userId })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      data: lists.map((list) => {
        const totalItems = list.items.length;
        const purchasedItems = list.items.filter((i) => i.purchased).length;
        return {
          id: list._id.toString(),
          name: list.name,
          sourceRecipeIds: list.sourceRecipeIds,
          itemCount: totalItems,
          purchasedCount: purchasedItems,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching grocery lists:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve grocery lists',
      },
    });
  }
});

/**
 * POST /me/grocery-lists
 * Create a new grocery list
 */
groceryListsRouter.post('/me/grocery-lists', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = createGroceryListSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid grocery list payload',
          details: parsed.error.format(),
        },
      });
    }

    const { name, sourceRecipeIds, items } = parsed.data;

    const formattedItems = (items || []).map((it, idx) => ({
      id: it.id || `item_${Date.now()}_${idx}`,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      category: inferCategory(it.name, it.category),
      purchased: it.purchased ?? false,
      sourceRecipeId: it.sourceRecipeId,
      note: it.note,
    }));

    const newList = await GroceryList.create({
      clerkUserId: userId,
      name,
      sourceRecipeIds: sourceRecipeIds || [],
      items: formattedItems,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newList._id.toString(),
        name: newList.name,
        sourceRecipeIds: newList.sourceRecipeIds,
        items: newList.items,
        createdAt: newList.createdAt,
        updatedAt: newList.updatedAt,
      },
      message: 'Grocery list created successfully',
    });
  } catch (error) {
    console.error('Error creating grocery list:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create grocery list',
      },
    });
  }
});

/**
 * GET /me/grocery-lists/:id
 * Retrieve a specific grocery list with all its categorized items
 */
groceryListsRouter.get('/me/grocery-lists/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const list = await GroceryList.findOne({ _id: id, clerkUserId: userId }).lean();

    if (!list) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Grocery list not found',
        },
      });
    }

    res.json({
      data: {
        id: list._id.toString(),
        name: list.name,
        sourceRecipeIds: list.sourceRecipeIds,
        items: list.items,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching grocery list by id:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve grocery list',
      },
    });
  }
});

/**
 * PATCH /me/grocery-lists/:id
 * Update grocery list title or items
 */
groceryListsRouter.patch('/me/grocery-lists/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parsed = updateGroceryListSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update payload',
        },
      });
    }

    const updates: any = {};
    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name;
    }
    if (parsed.data.items !== undefined) {
      updates.items = parsed.data.items.map((it, idx) => ({
        id: it.id || `item_${Date.now()}_${idx}`,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        category: inferCategory(it.name, it.category),
        purchased: it.purchased ?? false,
        sourceRecipeId: it.sourceRecipeId,
        note: it.note,
      }));
    }

    const updated = await GroceryList.findOneAndUpdate(
      { _id: id, clerkUserId: userId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Grocery list not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: updated._id.toString(),
        name: updated.name,
        items: updated.items,
        updatedAt: updated.updatedAt,
      },
      message: 'Grocery list updated',
    });
  } catch (error) {
    console.error('Error updating grocery list:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update grocery list',
      },
    });
  }
});

/**
 * DELETE /me/grocery-lists/:id
 * Delete an entire grocery list
 */
groceryListsRouter.delete('/me/grocery-lists/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await GroceryList.deleteOne({ _id: id, clerkUserId: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Grocery list not found',
        },
      });
    }

    res.json({
      success: true,
      message: 'Grocery list deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete grocery list',
      },
    });
  }
});

/**
 * POST /me/grocery-lists/:id/items
 * Add an individual item to a grocery list
 */
groceryListsRouter.post('/me/grocery-lists/:id/items', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parsed = groceryItemInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid item payload',
          details: parsed.error.format(),
        },
      });
    }

    const it = parsed.data;
    const newItem = {
      id: it.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      category: inferCategory(it.name, it.category),
      purchased: it.purchased ?? false,
      sourceRecipeId: it.sourceRecipeId,
      note: it.note,
    };

    const updated = await GroceryList.findOneAndUpdate(
      { _id: id, clerkUserId: userId },
      { $push: { items: newItem } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Grocery list not found',
        },
      });
    }

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Item added to grocery list',
    });
  } catch (error) {
    console.error('Error adding item to grocery list:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add item',
      },
    });
  }
});

/**
 * PATCH /me/grocery-lists/:id/items/:itemId
 * Toggle purchased status or update properties of an item
 */
groceryListsRouter.patch('/me/grocery-lists/:id/items/:itemId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id, itemId } = req.params;
    const { purchased, quantity, unit, name, note } = req.body;

    const list = await GroceryList.findOne({ _id: id, clerkUserId: userId });

    if (!list) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Grocery list not found',
        },
      });
    }

    const item = list.items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found in grocery list',
        },
      });
    }

    if (purchased !== undefined) item.purchased = Boolean(purchased);
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (unit !== undefined) item.unit = unit;
    if (name !== undefined) {
      item.name = name;
      item.category = inferCategory(name, item.category);
    }
    if (note !== undefined) item.note = note;

    await list.save();

    res.json({
      success: true,
      data: item,
      message: 'Item updated successfully',
    });
  } catch (error) {
    console.error('Error updating item in grocery list:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update item',
      },
    });
  }
});

/**
 * DELETE /me/grocery-lists/:id/items/:itemId
 * Remove an item from a grocery list
 */
groceryListsRouter.delete('/me/grocery-lists/:id/items/:itemId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { id, itemId } = req.params;

    const updated = await GroceryList.findOneAndUpdate(
      { _id: id, clerkUserId: userId },
      { $pull: { items: { id: itemId } } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Grocery list not found',
        },
      });
    }

    res.json({
      success: true,
      message: 'Item removed from grocery list',
    });
  } catch (error) {
    console.error('Error removing item from grocery list:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove item',
      },
    });
  }
});
