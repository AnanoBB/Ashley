import { test, expect, knownBug } from '../../src/fixtures';
import { cheapestSize, MATTRESS_KEYS } from '../../src/data/mattresses';
import { formatUsd } from '../../src/utils/money';

test.describe('Header: mattresses menu', { tag: ['@ui', '@regression', '@header'] }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('UI-05 hovering "Mattresses" opens the menu with all 3 mattresses', async ({
    homePage,
    mattressCatalog,
  }) => {
    await test.step('Hover "Mattresses" in the header', () => homePage.header.openMattressesMenu());

    for (const key of MATTRESS_KEYS) {
      const mattress = mattressCatalog[key];

      await test.step(`Menu shows a card for ${mattress.title}`, async () => {
        const card = homePage.header.menuCard(mattress.menuCardTestId);
        await expect(card).toBeVisible();
        await expect(card).toContainText(mattress.title);
      });
    }
  });

  for (const key of MATTRESS_KEYS) {
    test(`UI-06 menu card opens the ${key} mattress product page`, async ({
      page,
      homePage,
      productPage,
      mattressCatalog,
    }) => {
      const mattress = mattressCatalog[key];

      await test.step('Open the mattresses menu and click the card', async () => {
        await homePage.header.clickMattressMenuCard(mattress.menuCardTestId);
      });

      await test.step(`${mattress.title} product page is shown`, async () => {
        await expect(page).toHaveURL(mattress.path);
        await expect(productPage.heading).toHaveText(mattress.title);
      });
    });

    test(`UI-07 menu "from" price for the ${key} mattress matches its cheapest size`, async ({
      homePage,
      productPage,
      mattressCatalog,
    }) => {
      const mattress = mattressCatalog[key];
      const cheapest = cheapestSize(mattress);
      const expectedPrice = formatUsd(cheapest.priceCents);

      await test.step(`Menu card shows "${expectedPrice}+"`, async () => {
        await homePage.header.openMattressesMenu();
        await expect(homePage.header.menuCard(mattress.menuCardTestId)).toContainText(
          `${expectedPrice}+`,
        );
      });

      await test.step(`Product page shows ${expectedPrice} for ${cheapest.title}`, async () => {
        await productPage.goto(mattress.path);
        await productPage.selectSize(cheapest.title);
        await expect(productPage.selectedSize).toHaveText(cheapest.title);
        await expect(productPage.price).toHaveText(expectedPrice);
      });
    });
  }

  test('UI-08 "Shop All Mattresses" opens the listing with all 3 mattresses', async ({
    page,
    homePage,
    mattressesPage,
    mattressCatalog,
  }) => {
    await test.step('Open the menu and click "Shop All Mattresses"', async () => {
      await homePage.header.openMattressesMenu();
      await homePage.header.shopAllMattresses.click();
    });

    await test.step('Listing shows every mattress', async () => {
      await expect(page).toHaveURL('/mattresses');
      for (const key of MATTRESS_KEYS) {
        await expect(mattressesPage.productCard(mattressCatalog[key].apiName)).toBeVisible();
      }
    });
  });

  test.fail(
    'UI-09 header "Mattresses" link opens the mattress listing',
    knownBug(13, 'the link opens /mattress (one product), not /mattresses'),
    async ({ page, homePage }) => {
      await test.step('Click "Mattresses" in the header', () =>
        homePage.header.mattressesLink.click());

      await test.step('URL is the listing /mattresses', async () => {
        await expect(page).toHaveURL('/mattresses');
      });
    },
  );
});
