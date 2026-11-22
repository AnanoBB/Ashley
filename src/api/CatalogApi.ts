import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';

/** The storefront's own catalog route on the UI host: the source of expected names, sizes and prices. */
export class CatalogApi extends BaseApi {
  getProducts(names: readonly string[]): Promise<APIResponse> {
    return this.get('/api/catalog/products', { name: names.join(',') });
  }
}
