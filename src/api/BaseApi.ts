import type { APIRequestContext, APIResponse } from '@playwright/test';

export type QueryParams = Record<string, string | number | boolean>;

export abstract class BaseApi {
  constructor(protected readonly request: APIRequestContext) {}

  protected get(path: string, params?: QueryParams): Promise<APIResponse> {
    return this.request.get(path, { params });
  }
}
