import { test, expect } from '../../src/fixtures';

test.describe('Home page and hero', { tag: ['@ui', '@smoke'] }, () => {
  test('UI-01 home page opens', async ({ page, homePage }) => {
    await test.step('Open the home page', () => homePage.goto());

    await test.step('Home page is shown', async () => {
      await expect(page).toHaveURL('/');
      await expect(page).toHaveTitle(/Awara/);
      await expect(homePage.heroHeading).toBeVisible();
      await expect(homePage.header.logo).toBeVisible();
    });
  });

  test(
    'UI-02 hero "Shop Mattress" opens /mattress',
    {
      annotation: {
        type: 'known bug',
        description:
          'docs/exploration.md #1: hero links to /mattresses/essential-latex-hybrid-mattress, not /mattress',
      },
    },
    async ({ page, homePage }) => {
      test.fail();

      await test.step('Open the home page', () => homePage.goto());

      await test.step('Click "Shop Mattress" in the hero banner', () =>
        homePage.heroShopMattress.click());

      await test.step('URL is /mattress', async () => {
        await expect(page).toHaveURL('/mattress');
      });
    },
  );

  test('UI-03 hero "Shop Mattress" opens a mattress product page', async ({
    page,
    homePage,
    productPage,
    mattressCatalog,
  }) => {
    const mattressTitles = Object.values(mattressCatalog).map((mattress) => mattress.title);

    await test.step('Open the home page', () => homePage.goto());

    await test.step('Click "Shop Mattress" in the hero banner', () =>
      homePage.heroShopMattress.click());

    await test.step('A mattress product page from the catalog is shown', async () => {
      await expect(page).toHaveURL(/\/mattress/);
      await productPage.waitUntilReady();
      expect(mattressTitles).toContain(await productPage.heading.innerText());
    });
  });
});

test.describe('Overlays', { tag: ['@ui', '@regression'] }, () => {
  test.use({ autoDismissOverlays: ['promoModal', 'protectionPlanModal'] });

  test('UI-04 cookie banner can be accepted and does not block the hero CTA', async ({
    page,
    homePage,
  }) => {
    await test.step('Open the home page', () => homePage.goto());

    await test.step('Cookie banner appears', async () => {
      await expect(homePage.cookieBanner).toBeVisible();
    });

    await test.step('Accept all cookies', async () => {
      await homePage.acceptAllCookies.click();
      await expect(homePage.cookieBanner).toBeHidden();
    });

    await test.step('Hero CTA is clickable', async () => {
      await homePage.heroShopMattress.click();
      await expect(page).toHaveURL(/\/mattress/);
    });
  });
});
