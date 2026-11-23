import { test, expect } from '../../src/fixtures';
import { MATTRESS_KEYS } from '../../src/data/mattresses';

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

      await test.step('Open the mattresses menu and click the card', () =>
        homePage.header.clickMattressMenuCard(mattress.menuCardTestId));

      await test.step(`${mattress.title} product page is shown`, async () => {
        await expect(page).toHaveURL(mattress.path);
        await expect(productPage.heading).toHaveText(mattress.title);
      });
    });
  }

  test('UI-08 "Shop All Mattresses" opens the listing with all 3 mattresses', async ({
    page,
    homePage,
    mattressesPage,
    mattressCatalog,
  }) => {
    await test.step('Open the menu and click "Shop All Mattresses"', () =>
      homePage.header.clickShopAllMattresses());

    await test.step('Listing shows every mattress', async () => {
      await expect(page).toHaveURL('/mattresses');
      for (const key of MATTRESS_KEYS) {
        await expect(mattressesPage.productCard(mattressCatalog[key].apiName)).toBeVisible();
      }
    });
  });
});
