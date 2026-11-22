import { test, expect } from '../../src/fixtures';
import { expectApiError, expectProducts } from './support';

const BRAND = 'awara';

test.describe('Products API: negative cases', { tag: ['@api', '@regression', '@negative'] }, () => {
  test('API-09 no query parameters is rejected with 400', async ({ productsApi }) => {
    const response = await test.step('GET /products', () => productsApi.getProducts({}));

    const error = await expectApiError(response, 400);

    await test.step('The error says brand is missing', () => {
      expect(error.error).toBe('missed brand values');
    });
  });

  test('API-10 an empty brand is rejected with 400', async ({ productsApi }) => {
    const response = await test.step('GET /products?brand=', () =>
      productsApi.getProducts({ brand: '' }));

    const error = await expectApiError(response, 400);

    await test.step('The error says the brand is unknown', () => {
      expect(error.error).toContain('No such brand name');
    });
  });

  const unusualNames = [
    { case: 'SQL-like characters', name: "' OR 1=1--" },
    { case: '3000 characters', name: 'a'.repeat(3000) },
    { case: 'an empty value', name: '' },
  ];

  for (const { case: label, name } of unusualNames) {
    test(`API-11 a name with ${label} returns an empty list, not an error`, async ({
      productsApi,
    }) => {
      const response = await test.step(`GET /products with a name of ${label}`, () =>
        productsApi.getProducts({ name, lang: 'en', brand: BRAND }));

      const body = await expectProducts(response);

      await test.step('result.data is empty', () => {
        expect(body.result.data).toEqual([]);
      });
    });
  }

  for (const method of ['POST', 'PUT', 'DELETE']) {
    test(`API-12 ${method} /products is rejected with 405`, async ({ productsApi }) => {
      const response = await test.step(`${method} /products?brand=${BRAND}`, () =>
        productsApi.sendProducts(method, { brand: BRAND }));

      await test.step('Response status is 405 and only GET is allowed', async () => {
        expect(response.status(), `Unexpected status for ${method} ${response.url()}`).toBe(405);
        expect(await response.text()).toContain('Defined methods: GET');
      });
    });
  }
});
