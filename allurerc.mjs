// Allure 3 config, picked up by `allure generate`. `history.jsonl` keeps results across runs: in CI
// it is downloaded from the published report before generating and published with it afterwards.
export default {
  name: 'Awara QA Automation',
  output: './allure-report',
  historyPath: './history.jsonl',
};
