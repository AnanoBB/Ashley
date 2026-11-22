import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** The "all mattresses" listing at /mattresses. */
export class MattressesPage extends BasePage {
  readonly list: Locator;

  constructor(page: Page) {
    super(page);
    this.list = page.getByTestId('mattresses_list_container');
  }

  productCard(apiName: string): Locator {
    return this.list.getByTestId(`product_card_${apiName}`);
  }
}
