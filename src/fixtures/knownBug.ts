import type { TestDetails } from '@playwright/test';

const BUG_LIST_URL =
  'https://github.com/AnanoBB/Ashley/blob/main/docs/exploration.md#possible-bugs';

/**
 * Details for a test that checks a known site bug (use with `test.fail(title, details, body)`):
 * the `@known-bug` tag, a note naming the bug in docs/exploration.md and an issue link for Allure.
 */
export function knownBug(bugNumber: number, description: string): TestDetails {
  return {
    tag: '@known-bug',
    annotation: [
      { type: 'known bug', description: `docs/exploration.md #${bugNumber}: ${description}` },
      { type: 'issue', description: BUG_LIST_URL },
    ],
  };
}
