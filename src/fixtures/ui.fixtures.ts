import { test as base } from '@playwright/test';
import { OVERLAYS, registerOverlayHandlers, type Overlay } from '../components/overlays';
import { CartPage } from '../pages/CartPage';
import { HomePage } from '../pages/HomePage';
import { MattressesPage } from '../pages/MattressesPage';
import { ProductPage } from '../pages/ProductPage';

interface UiOptions {
  /** Popups to dismiss automatically. Remove one to test that popup directly. */
  autoDismissOverlays: readonly Overlay[];
}

// Dynamic Yield's client scripts inject an email popup at random times (third-party, out of scope).
// The app's own A/B flags (`/api/dynamic-yield/*`) are not blocked, so its upsell dialogs still show.
const MARKETING_SCRIPT_HOSTS = /^https:\/\/(cdn|st)\.dynamicyield\.com\//;

interface UiFixtures {
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  mattressesPage: MattressesPage;
}

export const uiTest = base.extend<UiOptions & UiFixtures>({
  autoDismissOverlays: [OVERLAYS, { option: true }],

  page: async ({ page, baseURL, autoDismissOverlays }, use) => {
    await page.route(MARKETING_SCRIPT_HOSTS, (route) => route.abort());
    if (autoDismissOverlays.includes('cookieBanner') && baseURL) {
      // OneTrust skips the banner when this cookie is present. Dismissing it with a click instead
      // moves the mouse and closes hover menus mid-test. The handler below stays as a fallback.
      await page.context().addCookies([
        {
          name: 'OptanonAlertBoxClosed',
          value: new Date().toISOString(),
          url: baseURL,
        },
      ]);
    }
    await registerOverlayHandlers(page, autoDismissOverlays);
    await use(page);
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  mattressesPage: async ({ page }, use) => {
    await use(new MattressesPage(page));
  },
});
