import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroHeading: Locator;
  readonly heroShopMattress: Locator;
  readonly cookieBanner: Locator;
  readonly acceptAllCookies: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.getByRole('heading', { level: 1 });
    // Three hero copies share this test id (two are hidden responsive layouts).
    this.heroShopMattress = page.getByTestId('hero_shop_mattress_btn').filter({ visible: true });
    this.cookieBanner = page.getByRole('region', { name: 'Cookie banner' });
    this.acceptAllCookies = page.getByRole('button', { name: 'Accept All Cookies' });
  }

  async goto(): Promise<void> {
    await this.open('/');
    await this.heroShopMattress.waitFor();
  }
}
