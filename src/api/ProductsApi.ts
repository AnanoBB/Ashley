import type { APIResponse } from '@playwright/test';
import { BaseApi, type QueryParams } from './BaseApi';

export interface ProductsQuery {
  brand?: string;
  name?: string;
  lang?: string;
}

function toParams(query: ProductsQuery): QueryParams {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined),
  ) as QueryParams;
}

export class ProductsApi extends BaseApi {
  getProducts(query: ProductsQuery): Promise<APIResponse> {
    return this.get('/products', toParams(query));
  }

  /** `/products` with another HTTP method (the API only defines GET). */
  sendProducts(method: string, query: ProductsQuery): Promise<APIResponse> {
    return this.send(method, '/products', toParams(query));
  }
}
