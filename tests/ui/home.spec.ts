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

    await test.step('URL contains /mattress and a catalog mattress page is shown', async () => {
      await expect(page).toHaveURL(/\/mattress/);
      await productPage.waitUntilReady();
      expect(mattressTitles).toContain(await productPage.heading.innerText());
    });
  });
});

test.describe('Hero link target', { tag: ['@ui', '@regression'] }, () => {
  test(
    'UI-02 hero "Shop Mattress" opens exactly /mattress',
    {
      tag: '@known-bug',
      annotation: [
        {
          type: 'known bug',
          description:
            'docs/exploration.md #1: hero links to /mattresses/essential-latex-hybrid-mattress, not /mattress',
        },
        {
          type: 'issue',
          description:
            'https://github.com/AnanoBB/Ashley/blob/main/docs/exploration.md#possible-bugs',
        },
      ],
    },
    async ({ page, homePage }) => {
      test.fail();

      await test.step('Open the home page', () => homePage.goto());

      await test.step('Click "Shop Mattress" in the hero banner', () =>
        homePage.heroShopMattress.click());

      await test.step('Path is exactly /mattress', async () => {
        await expect(page).toHaveURL('/mattress');
      });
    },
  );
});
