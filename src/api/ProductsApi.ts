import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';

export interface ProductsQuery {
  brand?: string;
  name?: string;
  lang?: string;
}

export class ProductsApi extends BaseApi {
  getProducts(query: ProductsQuery): Promise<APIResponse> {
    // Playwright drops undefined params, so an omitted filter is not sent.
    return this.get('/products', query as Record<string, string>);
  }
}
