import type { Locator, Page, Response } from '@playwright/test';
import { BasePage } from './BasePage';

/** The storefront's 404 page, shown for any unknown path. */
export class NotFoundPage extends BasePage {
  readonly heading: Locator;
  readonly backToHome: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Oops, You Hit a Wrong Page' });
    this.backToHome = page.getByTestId('404_back_to_home_btn');
  }

  goto(path: string): Promise<Response | null> {
    return this.open(path);
  }
}
