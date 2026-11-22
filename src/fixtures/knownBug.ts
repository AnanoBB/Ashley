import type { TestDetails } from '@playwright/test';

// GITHUB_REPOSITORY is set in GitHub Actions, so a fork links to its own docs.
const BUG_LIST_URL = `https://github.com/${process.env.GITHUB_REPOSITORY ?? 'AnanoBB/Ashley'}/blob/main/docs/exploration.md#possible-bugs`;

/**
 * Details for a test that checks a known site bug (use with `test.fail(title, details, body)`):
 * the `@known-bug` tag, a note naming the bug in docs/exploration.md and an issue link for Allure.
 * `expectedError` is text only the bug's failure message contains (e.g. the wrong URL the bug
 * lands on, not just the matcher name):
 * scripts/mark-known-bugs.mjs reports any other failure as broken, not as the known bug.
 */
export function knownBug(
  bugNumber: number,
  description: string,
  expectedError: string,
): TestDetails {
  return {
    tag: '@known-bug',
    annotation: [
      { type: 'known bug', description: `docs/exploration.md #${bugNumber}: ${description}` },
      { type: 'issue', description: BUG_LIST_URL },
      // Becomes the Allure label `expectedError`, read by scripts/mark-known-bugs.mjs.
      { type: 'allure.label.expectedError', description: expectedError },
    ],
  };
}
