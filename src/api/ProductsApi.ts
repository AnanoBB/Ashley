import type { APIResponse } from '@playwright/test';
import { BaseApi } from './BaseApi';

export interface ProductsQuery {
  brand?: string;
  name?: string;
  lang?: string;
}

export class ProductsApi extends BaseApi {
  getProducts(query: ProductsQuery): Promise<APIResponse> {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined),
    ) as Record<string, string>;
    return this.get('/products', params);
  }
}
