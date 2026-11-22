import { test, expect } from '../../src/fixtures';
import { expectApiError, expectProducts } from './support';

const BRAND = 'awara';
const PRODUCT_NAME = 'the-awara-hybrid-mattress-30';

test.describe('Products API: filter behaviour', { tag: ['@api', '@regression'] }, () => {
  test('API-03 an unknown brand is rejected with 400', async ({ productsApi }) => {
    const response = await test.step('GET /products?brand=nonexistent', () =>
      productsApi.getProducts({ brand: 'nonexistent' }));

    const error = await expectApiError(response, 400);

    await test.step('The error names the unknown brand', () => {
      expect(error.error).toContain("'nonexistent'");
    });
  });

  test('API-04 an unknown product name returns an empty list', async ({ productsApi }) => {
    const response = await test.step('GET /products?name=no-such-product&lang=en&brand=awara', () =>
      productsApi.getProducts({ name: 'no-such-product', lang: 'en', brand: BRAND }));

    const body = await expectProducts(response);

    await test.step('result.data is empty and total_count is 0', () => {
      expect(body.result.data).toEqual([]);
      expect(body.result.total_count).toBe(0);
    });
  });

  test(
    'API-05 a name without brand is rejected: brand is required',
    {
      annotation: {
        type: 'finding',
        description: 'name alone is not enough: the API requires brand',
      },
    },
    async ({ productsApi }) => {
      const response = await test.step(`GET /products?name=${PRODUCT_NAME}&lang=en`, () =>
        productsApi.getProducts({ name: PRODUCT_NAME, lang: 'en' }));

      const error = await expectApiError(response, 400);

      await test.step('The error says brand is missing', () => {
        expect(error.error).toBe('missed brand values');
      });
    },
  );

  test(
    'API-06 lang does not change the response, and an unknown lang is accepted',
    {
      annotation: {
        type: 'finding',
        description:
          'lang=es, fr and xx all return the same body as lang=en; translations is empty',
      },
    },
    async ({ productsApi }) => {
      const english = await test.step('GET the product with lang=en', async () =>
        expectProducts(
          await productsApi.getProducts({ name: PRODUCT_NAME, lang: 'en', brand: BRAND }),
        ));

      for (const lang of ['es', 'fr', 'xx']) {
        await test.step(`lang=${lang} returns the same product as lang=en`, async () => {
          const other = await expectProducts(
            await productsApi.getProducts({ name: PRODUCT_NAME, lang, brand: BRAND }),
          );
          expect(other.result.data).toEqual(english.result.data);
        });
      }
    },
  );

  test('API-07a the brand filter is case-insensitive', async ({ productsApi }) => {
    const lower = await test.step('GET /products?brand=awara', async () =>
      expectProducts(await productsApi.getProducts({ brand: BRAND })));

    const upper = await test.step('GET /products?brand=AWARA', async () =>
      expectProducts(await productsApi.getProducts({ brand: BRAND.toUpperCase() })));

    // Lists are capped at 200 items; two truncated lists may hold different products.
    await test.step('Both lists are complete (not truncated)', () => {
      expect(lower.result.data).toHaveLength(lower.result.total_count);
      expect(upper.result.data).toHaveLength(upper.result.total_count);
    });

    await test.step('Both return the same products', () => {
      const ids = (body: typeof lower) => body.result.data.map((product) => product.id).sort();
      expect(ids(upper)).toEqual(ids(lower));
    });
  });

  test(
    'API-07b the name filter is case-sensitive',
    {
      annotation: {
        type: 'finding',
        description:
          'brand ignores case but name does not: brand=AWARA finds products, an uppercase name finds none',
      },
    },
    async ({ productsApi }) => {
      const response = await test.step('GET /products with the name in uppercase', () =>
        productsApi.getProducts({ name: PRODUCT_NAME.toUpperCase(), lang: 'en', brand: BRAND }));

      const body = await expectProducts(response);

      await test.step('No product is found', () => {
        expect(body.result.data).toEqual([]);
      });
    },
  );
});
