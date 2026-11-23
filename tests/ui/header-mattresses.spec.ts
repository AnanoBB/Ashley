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

      await test.step('Open the mattresses menu and click the card', () =>
        homePage.header.clickMattressMenuCard(mattress.menuCardTestId));

      await test.step(`${mattress.title} product page is shown`, async () => {
        await expect(page).toHaveURL(mattress.path);
        await expect(productPage.heading).toHaveText(mattress.title);
      });
    });

    // Quarantined: bug #30 makes it fail at random; restore as test() once #30 is fixed.
    test.fixme(
      `UI-07 menu "from" price for the ${key} mattress matches its cheapest size`,
      {
        tag: '@quarantine',
        annotation: {
          type: 'quarantine',
          description:
            'bug #30 resets the picked size at random (about 1 in 10 runs); UI-27 reproduces it on purpose',
        },
      },
      async ({ homePage, productPage, mattressCatalog }) => {
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
          await expect(
            productPage.selectedSize,
            'the picked size stays selected (bug #30)',
          ).toHaveText(cheapest.title);
          await expect(productPage.price).toHaveText(expectedPrice);
        });
      },
    );
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

  // Bug #31 only shows on a slow page load (3-9 s locally); on CI the first hover already works, so
  // a known-bug check can't tell. Restore it as test.fail(…, knownBug(31, …, 'Received: "false"'))
  // once the dead time can be reproduced on purpose (e.g. by holding the header's script).
  test.fixme(
    'UI-28 the mattresses menu opens on the first hover once the page is shown',
    {
      tag: '@quarantine',
      annotation: {
        type: 'quarantine',
        description:
          'bug #31 (menu ignores hovers after load) reproduces only on slow page loads, not on CI',
      },
    },
    async ({ homePage }) => {
      await test.step('Hover "Mattresses" once, as soon as the home page is shown', () =>
        homePage.header.hoverMattresses());

      await test.step('The menu opens', async () => {
        await expect(homePage.header.mattressesToggle).toHaveAttribute('aria-expanded', 'true');
      });
    },
  );

  test.fail(
    'UI-09 header "Mattresses" link opens the mattress listing',
    // `/mattress"` is the URL the bug lands on; the expected `/mattresses"` doesn't contain it.
    knownBug(13, 'the link opens /mattress (one product), not /mattresses', '/mattress"'),
    async ({ page, homePage }) => {
      await test.step('Click "Mattresses" in the header', () =>
        homePage.header.mattressesLink.click());

      // Precondition, not the check: wait for the click to navigate at all. QA can take ~20 s,
      // longer than the assertion timeout, and a check that ends on "/" isn't the known bug.
      await test.step('Wait for the page to leave /', () =>
        page.waitForURL((url) => url.pathname !== '/', { waitUntil: 'commit', timeout: 30_000 }));

      await test.step('URL is the listing /mattresses', async () => {
        await expect(page).toHaveURL('/mattresses');
      });
    },
  );
});
