import { test, expect } from '../../src/fixtures';
import { cheapestSize, MATTRESS_KEYS } from '../../src/data/mattresses';
import { formatUsd } from '../../src/utils/money';

test.describe('Header: mattresses menu', { tag: ['@ui', '@regression', '@header'] }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('UI-05 hovering "Mattresses" opens the menu with all 3 mattresses', async ({
    header,
    mattressCatalog,
  }) => {
    await test.step('Hover "Mattresses" in the header', () => header.openMattressesMenu());

    for (const key of MATTRESS_KEYS) {
      const mattress = mattressCatalog[key];

      await test.step(`Menu shows a card for ${mattress.title}`, async () => {
        const card = header.menuCard(mattress.menuCardTestId);
        await expect(card).toBeVisible();
        await expect(card).toContainText(mattress.title);
      });
    }
  });

  for (const key of MATTRESS_KEYS) {
    test(`UI-06 menu card opens the ${key} mattress product page`, async ({
      page,
      header,
      productPage,
      mattressCatalog,
    }) => {
      const mattress = mattressCatalog[key];

      await test.step('Open the mattresses menu and click the card', async () => {
        await header.clickMattressMenuCard(mattress.menuCardTestId);
      });

      await test.step(`${mattress.title} product page is shown`, async () => {
        await expect(page).toHaveURL(mattress.path);
        await expect(productPage.heading).toHaveText(mattress.title);
      });
    });

    test(`UI-07 menu "from" price for the ${key} mattress matches its cheapest size`, async ({
      header,
      productPage,
      mattressCatalog,
    }) => {
      const mattress = mattressCatalog[key];
      const cheapest = cheapestSize(mattress);
      const expectedPrice = formatUsd(cheapest.priceCents);

      await test.step(`Menu card shows "${expectedPrice}+"`, async () => {
        await header.openMattressesMenu();
        await expect(header.menuCard(mattress.menuCardTestId)).toContainText(`${expectedPrice}+`);
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
    header,
    mattressesPage,
    mattressCatalog,
  }) => {
    await test.step('Open the menu and click "Shop All Mattresses"', async () => {
      await header.openMattressesMenu();
      await header.shopAllMattresses.click();
    });

    await test.step('Listing shows every mattress', async () => {
      await expect(page).toHaveURL('/mattresses');
      for (const key of MATTRESS_KEYS) {
        await expect(mattressesPage.productCard(mattressCatalog[key].apiName)).toBeVisible();
      }
    });
  });

  test(
    'UI-09 header "Mattresses" link opens the mattress listing',
    {
      tag: '@known-bug',
      annotation: [
        {
          type: 'known bug',
          description:
            'docs/exploration.md #13: the link opens /mattress (one product), not /mattresses',
        },
        {
          type: 'issue',
          description:
            'https://github.com/AnanoBB/Ashley/blob/main/docs/exploration.md#possible-bugs',
        },
      ],
    },
    async ({ page, header }) => {
      test.fail();

      await test.step('Click "Mattresses" in the header', () => header.mattressesLink.click());

      await test.step('URL is the listing /mattresses', async () => {
        await expect(page).toHaveURL('/mattresses');
      });
    },
  );
});
