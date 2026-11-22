// Allure 3 config, picked up by `allure generate`. `history.jsonl` keeps results across runs: in CI
// it is downloaded from the published report before generating and published with it afterwards.
export default {
  name: 'Awara QA Automation',
  output: './allure-report',
  historyPath: './history.jsonl',
  // Known bugs first, so they don't land in "Product errors". scripts/mark-known-bugs.mjs marks
  // @known-bug results as failed before generating. The two defaults are kept after them.
  categories: {
    rules: [
      {
        name: 'Known product bugs',
        matchers: { statuses: ['failed'], labels: { knownBug: 'expected-failure' } },
        expand: true,
      },
      {
        name: 'Known bug no longer reproduces',
        matchers: { statuses: ['failed'], labels: { knownBug: 'no-longer-reproduces' } },
        expand: true,
      },
      { name: 'Product errors', matchers: { statuses: ['failed'] } },
      { name: 'Test errors', matchers: { statuses: ['broken'] } },
    ],
  },
};
