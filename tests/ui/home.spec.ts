import { test, expect, knownBug } from '../../src/fixtures';
import { MATTRESS_URL } from '../../src/data/mattresses';

test.describe('Home page and hero', { tag: ['@ui', '@smoke'] }, () => {
  test('UI-01 home page opens', async ({ page, homePage }) => {
    const response = await test.step('Open the home page', () => homePage.goto());

    await test.step('Home page is shown', async () => {
      expect(response?.status(), 'home page HTTP status').toBe(200);
      await expect(page).toHaveURL('/');
      await expect(page).toHaveTitle(/Awara/);
      await expect(homePage.heroHeading).toBeVisible();
      await expect(homePage.header.logo).toBeVisible();
    });
  });

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

    await test.step('URL is a /mattress page and a catalog mattress is shown', async () => {
      await expect(page).toHaveURL(MATTRESS_URL);
      await productPage.waitUntilReady();
      expect(mattressTitles).toContain(await productPage.heading.innerText());
    });
  });
});

test.describe('Hero link target', { tag: ['@ui', '@regression'] }, () => {
  test.fail(
    'UI-02 hero "Shop Mattress" opens exactly /mattress',
    knownBug(
      1,
      'hero links to /mattresses/essential-latex-hybrid-mattress, not /mattress',
      'toHaveURL',
    ),
    async ({ page, homePage }) => {
      await test.step('Open the home page', () => homePage.goto());

      await test.step('Click "Shop Mattress" in the hero banner', () =>
        homePage.heroShopMattress.click());

      await test.step('Path is exactly /mattress', async () => {
        await expect(page).toHaveURL('/mattress');
      });
    },
  );
});

test.describe('Unknown pages', { tag: ['@ui', '@regression', '@negative'] }, () => {
  test('UI-25 an unknown URL shows the 404 page with a way back home', async ({
    page,
    notFoundPage,
  }) => {
    const response = await test.step('Open /mattresses/no-such-mattress', () =>
      notFoundPage.goto('/mattresses/no-such-mattress'));

    await test.step('HTTP status is 404 and the not-found page is shown', async () => {
      expect(response?.status(), 'HTTP status').toBe(404);
      await expect(notFoundPage.heading).toBeVisible();
    });

    await test.step('"Back to home" opens the home page', async () => {
      await notFoundPage.backToHome.click();
      await expect(page).toHaveURL('/');
    });
  });
});
