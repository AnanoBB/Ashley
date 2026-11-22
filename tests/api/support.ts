import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { ApiErrorSchema, type ApiError } from '../../src/api/schemas/error.schema';
import {
  ProductsResponseSchema,
  type ProductsResponse,
} from '../../src/api/schemas/products.schema';

async function expectStatus(response: APIResponse, status: number): Promise<void> {
  await test.step(`Response status is ${status}`, () => {
    expect(response.status(), `Unexpected status for ${response.url()}`).toBe(status);
  });
}

async function expectJson(response: APIResponse, status: number): Promise<unknown> {
  await expectStatus(response, status);

  await test.step('Content-Type is application/json', () => {
    expect(response.headers()['content-type']).toContain('application/json');
  });

  return response.json();
}

/** 200 → JSON → products schema. Returns the parsed body for the test's own assertions. */
export async function expectProducts(response: APIResponse): Promise<ProductsResponse> {
  const json = await expectJson(response, 200);
  return test.step('Body matches the products schema', () => ProductsResponseSchema.parse(json));
}

/** Expected status → plain-text body (e.g. 405 from the web server). Returns the body text. */
export async function expectTextError(response: APIResponse, status: number): Promise<string> {
  await expectStatus(response, status);

  await test.step('Content-Type is text/plain', () => {
    expect(response.headers()['content-type']).toContain('text/plain');
  });

  return response.text();
}

/** Expected status → JSON → error schema (`{ status: "error", error }`). */
export async function expectApiError(response: APIResponse, status: number): Promise<ApiError> {
  const json = await expectJson(response, status);
  return test.step('Body matches the error schema', () => ApiErrorSchema.parse(json));
}
