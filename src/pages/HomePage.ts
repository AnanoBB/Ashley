import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroHeading: Locator;
  readonly heroShopMattress: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.getByRole('heading', { level: 1 });
    // Three hero copies share this test id (two are hidden responsive layouts).
    this.heroShopMattress = page.getByTestId('hero_shop_mattress_btn').filter({ visible: true });
  }

  async goto(): Promise<void> {
    await this.open('/');
    await this.heroShopMattress.waitFor();
  }
}
