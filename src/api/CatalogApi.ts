import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';

/** Storefront catalog route on the UI host (not behind the API host's Cloudflare block). */
export class CatalogApi extends BaseApi {
  getProducts(names: readonly string[]): Promise<APIResponse> {
    return this.get('/api/catalog/products', { name: names.join(',') });
  }
}
