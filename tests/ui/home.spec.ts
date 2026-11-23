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
  test(
    'UI-02 hero "Shop Mattress" opens exactly /mattress',
    knownBug(
      1,
      'hero links to /mattresses/essential-latex-hybrid-mattress, not /mattress',
      // The URL the bug lands on (the `Received:` line), so a dead link or a 404 doesn't match.
      '/mattresses/essential-latex-hybrid-mattress"',
    ),
    async ({ page, homePage }) => {
      await test.step('Open the home page', () => homePage.goto());

      await test.step('Click "Shop Mattress" in the hero banner', () =>
        homePage.heroShopMattress.click());

      // Precondition, not the check: wait for the click to navigate at all. QA can take ~20 s,
      // longer than the assertion timeout, and a check that ends on "/" isn't the known bug.
      await test.step('Wait for the page to leave /', () =>
        page.waitForURL((url) => url.pathname !== '/', { waitUntil: 'commit', timeout: 30_000 }));

      // The bug's step: only now is a failure the known bug. A failed setup above stays an
      // ordinary failure, so CI retries it instead of mark-known-bugs calling it broken.
      test.fail();

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
