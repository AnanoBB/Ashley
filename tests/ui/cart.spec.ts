import { test, expect } from '../../src/fixtures';
import { CartResponseSchema } from '../../src/api/schemas/cart.schema';
import { sizeOf } from '../../src/data/mattresses';
import { formatUsd } from '../../src/utils/money';

const DEFAULT_SIZE = 'Queen';

test.describe(
  'Assignment flow: home → Shop Mattress → add to cart',
  { tag: ['@ui', '@smoke', '@cart'] },
  () => {
    test('UI-13 UI-14 UI-15 mattress from the hero is added to the cart', async ({
      page,
      homePage,
      productPage,
      cartPage,
      mattressCatalog,
    }) => {
      await test.step('Open the home page', async () => {
        await homePage.goto();
        await expect(homePage.heroHeading).toBeVisible();
      });

      await test.step('Click "Shop Mattress" in the hero banner', async () => {
        await homePage.heroShopMattress.click();
        await expect(page).toHaveURL(/\/mattress/);
        await productPage.waitUntilReady();
      });

      const title = await productPage.heading.innerText();
      const mattress = Object.values(mattressCatalog).find(
        (candidate) => candidate.title === title,
      );
      expect(mattress, `"${title}" is a mattress from the catalog API`).toBeDefined();
      const expectedPrice = formatUsd(sizeOf(mattress!, DEFAULT_SIZE).priceCents);

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
  test('UI-12 product page defaults to Queen with its catalog price', async ({
    productPage,
    mattressCatalog,
  }) => {
    const mattress = mattressCatalog.classic;

    await test.step(`Open ${mattress.title}`, () => productPage.goto(mattress.path));

    await test.step('Queen is selected with the catalog price and Add to Cart is enabled', async () => {
      await expect(productPage.heading).toHaveText(mattress.title);
      await expect(productPage.selectedSize).toHaveText(DEFAULT_SIZE);
      await expect(productPage.price).toHaveText(
        formatUsd(sizeOf(mattress, DEFAULT_SIZE).priceCents),
      );
      await expect(productPage.addToCartButton).toBeEnabled();
    });
  });

  test('UI-16 a different size updates the price and reaches the cart', async ({
    productPage,
    cartPage,
    mattressCatalog,
  }) => {
    const mattress = mattressCatalog.classic;
    const king = sizeOf(mattress, 'King');
    const kingPrice = formatUsd(king.priceCents);

    await test.step(`Open ${mattress.title} and select King`, async () => {
      await productPage.goto(mattress.path);
      await productPage.selectSize(king.title);
    });

    await test.step(`Price updates to ${kingPrice}`, async () => {
      await expect(productPage.selectedSize).toHaveText(king.title);
      await expect(productPage.price).toHaveText(kingPrice);
    });

    await test.step('Add to cart', async () => {
      const { response, upsellDeclined } = await productPage.addToCart();
      test.info().annotations.push({
        type: 'upsell',
        description: upsellDeclined ? 'shown and declined' : 'not shown',
      });
      expect(response.status()).toBe(200);
    });

    await test.step('Cart shows King at the King price', async () => {
      const item = cartPage.item(mattress.title);
      await expect(item.size).toContainText(king.title);
      await expect(item.price).toHaveText(kingPrice);
      await expect(cartPage.total).toHaveText(kingPrice);
    });
  });

  test('UI-18 adding the same mattress twice totals quantity 2 and matches the counter', async ({
    page,
    productPage,
    cartPage,
    mattressCatalog,
  }) => {
    const mattress = mattressCatalog.classic;
    const unitCents = sizeOf(mattress, DEFAULT_SIZE).priceCents;

    for (const attempt of [1, 2]) {
      await test.step(`Add ${mattress.title} to the cart (${attempt}/2)`, async () => {
        await productPage.goto(mattress.path);
        const { response } = await productPage.addToCart();
        expect(response.status()).toBe(200);
        await expect(page).toHaveURL('/checkout/cart');
      });
    }

    await test.step('Cart quantities add up to 2 and the total is 2 × the unit price', async () => {
      await expect(cartPage.lineItems.first()).toBeVisible();
      const quantities = await page.getByTestId('quantity_number').allInnerTexts();
      expect(quantities.reduce((sum, quantity) => sum + Number(quantity), 0)).toBe(2);
      await expect(cartPage.total).toHaveText(formatUsd(unitCents * 2));
    });

    await test.step('Header counter matches the cart', async () => {
      await productPage.goto(mattress.path);
      await expect(productPage.header.cartIcon).toHaveText('2');
    });
  });

  test.describe('with one Classic Hybrid (Queen) in the cart', () => {
    test.beforeEach(async ({ page, productPage, mattressCatalog }) => {
      await productPage.goto(mattressCatalog.classic.path);
      const { response } = await productPage.addToCart();
      expect(response.status()).toBe(200);
      await expect(page).toHaveURL('/checkout/cart');
    });

    test('UI-19 increasing the quantity updates quantity and total', async ({
      cartPage,
      mattressCatalog,
    }) => {
      const mattress = mattressCatalog.classic;
      const item = cartPage.item(mattress.title);
      const unitCents = sizeOf(mattress, DEFAULT_SIZE).priceCents;

      await test.step('Click + on the line item', () => item.increaseQuantity.click());

      await test.step('Quantity is 2 and the total doubles', async () => {
        await expect(item.quantity).toHaveText('2');
        await expect(cartPage.total).toHaveText(formatUsd(unitCents * 2));
      });
    });

    test('UI-20 removing the only item empties the cart and the counter', async ({
      homePage,
      cartPage,
      mattressCatalog,
    }) => {
      const item = cartPage.item(mattressCatalog.classic.title);

      await test.step('Remove the line item', () => item.decreaseOrRemove.click());

      await test.step('Cart shows the empty state', async () => {
        await expect(cartPage.emptyState).toBeVisible();
        await expect(cartPage.lineItems).toHaveCount(0);
      });

      await test.step('Header counter is empty', async () => {
        await homePage.goto();
        await expect(homePage.header.cartIcon).toHaveText('');
      });
    });

    test('UI-21 the cart survives a page reload', async ({ page, cartPage, mattressCatalog }) => {
      const mattress = mattressCatalog.classic;

      await test.step('Reload the cart page', () => page.reload({ waitUntil: 'domcontentloaded' }));

      await test.step('The item is still in the cart', async () => {
        const item = cartPage.item(mattress.title);
        await expect(cartPage.lineItems).toHaveCount(1);
        await expect(item.title).toHaveText(mattress.title);
        await expect(item.quantity).toHaveText('1');
      });
    });
  });

  test('UI-22 a new browser context starts with an empty cart', async ({ homePage, cartPage }) => {
    await test.step('Header counter is empty', async () => {
      await homePage.goto();
      await expect(homePage.header.cartIcon).toHaveText('');
    });

    await test.step('Cart page shows the empty state', async () => {
      await cartPage.goto();
      await expect(cartPage.emptyState).toBeVisible();
      await expect(cartPage.lineItems).toHaveCount(0);
    });
  });
});
