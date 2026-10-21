import { GroceryProvider } from './types.js';
import { CopyListGroceryProvider } from './copyList.js';
import { InstamartGroceryProvider } from './instamart.js';
import { env } from '../../config/env.js';

export class GroceryProviderRegistry {
  private providers: Map<string, GroceryProvider> = new Map();
  private primaryProviderId: string;

  constructor(primaryProviderId = 'copy_list') {
    this.primaryProviderId = primaryProviderId;

    const copyList = new CopyListGroceryProvider();
    const instamart = new InstamartGroceryProvider();

    this.register(copyList);
    this.register(instamart);
  }

  register(provider: GroceryProvider) {
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): GroceryProvider | undefined {
    return this.providers.get(providerId);
  }

  getActiveProvider(): GroceryProvider {
    const configured = this.providers.get(this.primaryProviderId);
    if (configured && configured.isAvailable()) {
      return configured;
    }
    // Fallback to copy_list which is always available
    const copyList = this.providers.get('copy_list');
    if (copyList) return copyList;
    
    const first = this.providers.values().next().value;
    if (!first) throw new Error('No grocery providers registered');
    return first;
  }
}

export const groceryRegistry = new GroceryProviderRegistry(env.GROCERY_PROVIDER || 'copy_list');
