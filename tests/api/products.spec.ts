import { test, expect } from '../../src/fixtures';
import {
  ProductsResponseSchema,
  type ProductsResponse,
} from '../../src/api/schemas/products.schema';

const BRAND = 'awara';
const PRODUCT_NAME = 'the-awara-hybrid-mattress-30';

test.describe('Products API', { tag: ['@api', '@smoke'] }, () => {
  test('GET /products by brand returns a non-empty list', async ({ productsApi }) => {
    const response = await test.step(`GET /products?brand=${BRAND}`, () =>
      productsApi.getProducts({ brand: BRAND }));

    await test.step('Response status is 200', () => {
      expect(response.status(), `Unexpected status for ${response.url()}`).toBe(200);
    });

    const body: ProductsResponse = await test.step('Body matches the products schema', async () =>
      ProductsResponseSchema.parse(await response.json()));

    await test.step('result.data length is greater than 0', () => {
      expect(body.result.data.length).toBeGreaterThan(0);
    });
  });

  test('GET /products by name returns exactly one product', async ({ productsApi }) => {
    const response =
      await test.step(`GET /products?name=${PRODUCT_NAME}&lang=en&brand=${BRAND}`, () =>
        productsApi.getProducts({ name: PRODUCT_NAME, lang: 'en', brand: BRAND }));

    await test.step('Response status is 200', () => {
      expect(response.status(), `Unexpected status for ${response.url()}`).toBe(200);
    });

    const body: ProductsResponse = await test.step('Body matches the products schema', async () =>
      ProductsResponseSchema.parse(await response.json()));

    await test.step('result.data length equals 1', () => {
      expect(body.result.data).toHaveLength(1);
    });
  });
});
