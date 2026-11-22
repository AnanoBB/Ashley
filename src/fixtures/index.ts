import { mergeTests } from '@playwright/test';
import { apiTest } from './api.fixtures';
import { uiTest } from './ui.fixtures';

export const test = mergeTests(apiTest, uiTest);

export { expect } from '@playwright/test';
export { knownBug } from './knownBug';
