import { test, expect } from '../../src/fixtures';
import { CartResponseSchema } from '../../src/api/schemas/cart.schema';
import { findByTitle, MATTRESS_URL, sizeOf } from '../../src/data/mattresses';
import { formatUsd } from '../../src/utils/money';

const DEFAULT_SIZE = 'Queen';

test.describe(
  'Assignment flow: home → Shop Mattress → add to cart',
  { tag: ['@ui', '@smoke', '@cart'] },
  () => {
    // One user journey; UI-14 (cart line) and UI-15 (cart total) from the test plan are its steps.
    test('UI-13 the mattress from the hero is added to the cart', async ({
      page,
      homePage,
      productPage,
      cartPage,
      mattressCatalog,
    }) => {
      await test.step('Open the home page', async () => {
        const response = await homePage.goto();
        expect(response?.status(), 'home page HTTP status').toBe(200);
        await expect(homePage.heroHeading).toBeVisible();
      });

      await test.step('Click "Shop Mattress" in the hero banner', async () => {
        await homePage.heroShopMattress.click();
        await expect(page).toHaveURL(MATTRESS_URL);
        await productPage.waitUntilReady();
      });

      const { title, expectedPrice } =
        await test.step('Look up the expected price in the catalog', async () => {
          const shownTitle = await productPage.heading.innerText();
          const mattress = findByTitle(mattressCatalog, shownTitle);
          return {
            title: shownTitle,
            expectedPrice: formatUsd(sizeOf(mattress, DEFAULT_SIZE).priceCents),
          };
        });

      const { response } = await test.step('Add the mattress to the cart', () =>
        productPage.addToCart());

      await test.step('Add-to-cart API call succeeded with 1 item', async () => {
        expect(response.status()).toBe(200);
        const cart = CartResponseSchema.parse(await response.json());
        expect(cart.result.itemsCount).toBe(1);
      });

      await test.step('Cart shows the mattress with size, price and quantity', async () => {
        await expect(page).toHaveURL('/checkout/cart');
        await expect(cartPage.lineItems).toHaveCount(1);
        const item = cartPage.item(title);
        await expect(item.title).toHaveText(title);
        await expect(item.size).toContainText(DEFAULT_SIZE);
        await expect(item.price).toHaveText(expectedPrice);
        await expect(item.quantity).toHaveText('1');
        await expect(cartPage.total).toHaveText(expectedPrice);
      });

      await test.step('Header cart counter shows 1', async () => {
        await homePage.goto();
        await expect(homePage.header.cartIcon).toHaveText('1');
      });
    });
  },
);

test.describe('Product page and cart', { tag: ['@ui', '@regression', '@cart'] }, () => {
  test('UI-21 the cart survives a page reload', async ({
    page,
    productPage,
    cartPage,
    mattressCatalog,
  }) => {
    const mattress = mattressCatalog.classic;

    await test.step(`Add ${mattress.title} (${DEFAULT_SIZE}) to the cart`, async () => {
      await productPage.goto(mattress.path);
      const { response } = await productPage.addToCart();
      expect(response.status()).toBe(200);
      await expect(page).toHaveURL('/checkout/cart');
    });

    await test.step('Reload the cart page', () => page.reload({ waitUntil: 'domcontentloaded' }));

    await test.step('The item is still in the cart', async () => {
      const item = cartPage.item(mattress.title);
      await expect(cartPage.lineItems).toHaveCount(1);
      await expect(item.title).toHaveText(mattress.title);
      await expect(item.quantity).toHaveText('1');
    });
  });

  // Guards against tests sharing a cart (e.g. a shared storageState added later).
  test('UI-22 a new browser context starts with an empty cart', async ({ homePage, cartPage }) => {
    await test.step('The server cart is empty and the header counter shows nothing', async () => {
      const cartLoad = cartPage.waitForCartLoad();
      await homePage.goto();
      const cart = CartResponseSchema.parse(await (await cartLoad).json());
      expect(cart.result.itemsCount).toBe(0);
      await expect(homePage.header.cartIcon).toHaveText('');
    });

    await test.step('Cart page shows the empty state', async () => {
      await cartPage.goto();
      await expect(cartPage.emptyState).toBeVisible();
      await expect(cartPage.lineItems).toHaveCount(0);
    });
  });

  test(
    'UI-26 a failed add-to-cart request leaves the cart empty',
    {
      tag: '@negative',
      annotation: {
        type: 'finding',
        description:
          'when POST /carts/my/items fails, the product page shows no error: the click silently does nothing',
      },
    },
    async ({ page, productPage, cartPage, mattressCatalog }) => {
      const mattress = mattressCatalog.classic;

      await test.step('The add-to-cart API returns 500 (stubbed)', () =>
        page.route('**/carts/my/items*', (route) =>
          route.request().method() === 'POST'
            ? route.fulfill({ status: 500, json: { status: 'error', error: 'stubbed failure' } })
            : route.fallback(),
        ));

      await test.step(`Open ${mattress.title} and click Add to Cart`, async () => {
        await productPage.goto(mattress.path);
        const { response } = await productPage.tryAddToCart();
        expect(response.status()).toBe(500);
      });

      await test.step('The shopper stays on the product page and can try again', async () => {
        // The button check waits for the page to settle, so a late redirect would fail the URL check.
        await expect(productPage.addToCartButton).toBeEnabled();
        await expect(page).toHaveURL(mattress.path);
      });

      await test.step('The cart is empty', async () => {
        await cartPage.goto();
        await expect(cartPage.emptyState).toBeVisible();
        await expect(cartPage.lineItems).toHaveCount(0);
      });
    },
  );
});
