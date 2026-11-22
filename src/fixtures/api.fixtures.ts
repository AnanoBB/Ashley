import { test as base, expect } from '@playwright/test';
import { CatalogApi } from '../api/CatalogApi';
import { ProductsApi } from '../api/ProductsApi';
import { CatalogResponseSchema } from '../api/schemas/catalog.schema';
import { env } from '../config/env';
import { buildMattressCatalog, MATTRESSES, type MattressCatalog } from '../data/mattresses';

interface ApiTestFixtures {
  productsApi: ProductsApi;
}

interface ApiWorkerFixtures {
  catalogApi: CatalogApi;
  /** Expected mattress titles, sizes and prices, loaded once per worker from the catalog API. */
  mattressCatalog: MattressCatalog;
}

export const apiTest = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  productsApi: async ({ request }, use) => {
    await use(new ProductsApi(request));
  },

  catalogApi: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({
        baseURL: env.baseUrl,
        userAgent: env.uiUserAgent,
      });
      await use(new CatalogApi(context));
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  mattressCatalog: [
    async ({ catalogApi }, use) => {
      const names = Object.values(MATTRESSES).map((mattress) => mattress.apiName);
      const response = await catalogApi.getProducts(names);
      expect(response.status(), `Catalog API status for ${response.url()}`).toBe(200);
      const body = CatalogResponseSchema.parse(await response.json());
      await use(buildMattressCatalog(body.result.data));
    },
    { scope: 'worker' },
  ],
});
