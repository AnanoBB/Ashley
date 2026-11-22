import { test, expect } from '../../src/fixtures';
import { expectProducts } from './support';

const BRAND = 'awara';
const PRODUCT_NAME = 'the-awara-hybrid-mattress-30';

test.describe('Products API: assignment', { tag: ['@api', '@smoke'] }, () => {
  test('API-01 GET /products by brand returns a non-empty list of that brand', async ({
    productsApi,
  }) => {
    const response = await test.step(`GET /products?brand=${BRAND}`, () =>
      productsApi.getProducts({ brand: BRAND }));

    const body = await expectProducts(response);

    await test.step('result.data length is greater than 0', () => {
      expect(body.result.data.length).toBeGreaterThan(0);
    });

    await test.step(`Every product has brand "${BRAND}"`, () => {
      const otherBrands = body.result.data
        .filter((product) => product.brand !== BRAND)
        .map((product) => `${product.name} (${product.brand})`);
      expect(otherBrands, 'products of another brand').toEqual([]);
    });
  });

  test('API-02 GET /products by name returns exactly that product', async ({ productsApi }) => {
    const response =
      await test.step(`GET /products?name=${PRODUCT_NAME}&lang=en&brand=${BRAND}`, () =>
        productsApi.getProducts({ name: PRODUCT_NAME, lang: 'en', brand: BRAND }));

    const body = await expectProducts(response);

    await test.step('result.data length equals 1', () => {
      expect(body.result.data).toHaveLength(1);
    });

    await test.step(`The product is ${PRODUCT_NAME} of brand "${BRAND}"`, () => {
      expect(body.result.data[0]).toMatchObject({ name: PRODUCT_NAME, brand: BRAND });
    });
  });
});

test.describe('Products API: consistency', { tag: ['@api', '@regression'] }, () => {
  test('API-08 the product found by name matches its entry in the brand list', async ({
    productsApi,
  }) => {
    const byName =
      await test.step(`GET /products?name=${PRODUCT_NAME}&lang=en&brand=${BRAND}`, async () =>
        expectProducts(
          await productsApi.getProducts({ name: PRODUCT_NAME, lang: 'en', brand: BRAND }),
        ));

    const byBrand = await test.step(`GET /products?brand=${BRAND}`, async () =>
      expectProducts(await productsApi.getProducts({ brand: BRAND })));

    await test.step('The name query found exactly one product', () => {
      expect(byName.result.data).toHaveLength(1);
    });

    // Lists are capped at 200 items; a truncated list may not contain the product.
    await test.step('The brand list is complete (not truncated)', () => {
      expect(byBrand.result.data).toHaveLength(byBrand.result.total_count);
    });

    await test.step('The brand list has the same product with the same id, name, title and price', () => {
      const [product] = byName.result.data;
      const inList = byBrand.result.data.find((candidate) => candidate.id === product.id);
      expect(inList, `${product.name} (${product.id}) is in the brand list`).toBeDefined();
      const summary = (p: typeof product) => ({
        id: p.id,
        name: p.name,
        title: p.title,
        brand: p.brand,
        price: p.pricing.price,
      });
      expect(summary(inList!)).toEqual(summary(product));
    });
  });
});
