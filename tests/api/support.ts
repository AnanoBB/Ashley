import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { MATTRESSES } from '../../src/data/mattresses';
import { ApiErrorSchema, type ApiError } from '../../src/api/schemas/error.schema';
import {
  ProductsResponseSchema,
  type ProductsResponse,
} from '../../src/api/schemas/products.schema';

export const BRAND = 'awara';
export const PRODUCT_NAME = MATTRESSES.classic.apiName;

// Only these headers go into the report: it is published, and others carry the runner's location
// (`geoloc`) and a Cloudflare cookie.
const REPORTED_HEADERS = ['content-type', 'content-length', 'cache-control', 'cf-ray'];

/** Attaches the request URL and the response (status, safe headers, body) to the report. */
async function attachExchange(response: APIResponse): Promise<void> {
  const body = await response.text();
  let parsedBody: unknown = body;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    // Not JSON: attach the text as it is.
  }
  const headers = Object.fromEntries(
    Object.entries(response.headers()).filter(([name]) => REPORTED_HEADERS.includes(name)),
  );
  // The API clients only send GET (BaseApi.get); APIResponse doesn't expose the request method.
  const exchange = {
    request: { method: 'GET', url: response.url() },
    response: { status: response.status(), headers, body: parsedBody },
  };
  await test.info().attach(`GET ${new URL(response.url()).pathname} → ${response.status()}`, {
    // Not indented: a brand list is over 1 MB pretty-printed.
    body: JSON.stringify(exchange),
    contentType: 'application/json',
  });
}

async function expectJson(response: APIResponse, status: number): Promise<unknown> {
  // First, so a failing check still has the exchange in the report.
  await attachExchange(response);

  await test.step(`Response status is ${status}`, () => {
    expect(response.status(), `Unexpected status for ${response.url()}`).toBe(status);
  });

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

/** Expected status → JSON → error schema (`{ status: "error", error }`). */
export async function expectApiError(response: APIResponse, status: number): Promise<ApiError> {
  const json = await expectJson(response, status);
  return test.step('Body matches the error schema', () => ApiErrorSchema.parse(json));
}
