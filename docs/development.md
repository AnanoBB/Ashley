# Development notes

Details behind the [README](../README.md): running in Docker, adding a test, troubleshooting.

## Running in Docker

Both CI test jobs (API and UI) run in the official Playwright image
`mcr.microsoft.com/playwright:v1.65.1-noble` (Ubuntu 24.04 with Node, Chromium and its system
libraries). The `Dockerfile` builds on the same image, so a local Docker run has the same OS,
browser build and fonts as CI. That makes a CI-only failure reproducible on your machine.

```bash
npm run test:docker                          # build the image (cached) and run all tests
npm run test:docker -- --grep @smoke         # extra arguments go to `playwright test`
BASE_URL=https://qa.awarasleep.com npm run test:docker -- --project=ui   # env vars are passed through
```

The project folder is mounted into the container, so code changes need no rebuild and the reports
land in the usual `allure-results/`, `playwright-report/` and `test-results/`. The container keeps
its own Linux `node_modules`, separate from yours. `.env` is not copied into the image, but the mounted
folder includes it, so `npm run test:docker` reads it. Environment variables (`BASE_URL`, `API_URL`,
`UI_USER_AGENT`, `API_USER_AGENT`) are passed through and override it.

Without npm, the same with plain Docker:

```bash
docker build -t awara-qa-tests .
docker run --rm --init --ipc=host -v "$PWD:/app" -v /app/node_modules awara-qa-tests --project=api
```

`--ipc=host` gives Chromium enough shared memory (Docker's default of 64 MB can crash it), and
`--init` makes sure browser processes are cleaned up. When Playwright is upgraded, update the image
tag in the `Dockerfile` and in `.github/workflows/ci.yml`; the CI `lint` job runs
`npm run check:playwright-image` and fails if they don't match `package-lock.json`.

## Adding a test

1. Pick the spec file for the area (or create `tests/<api|ui>/<area>.spec.ts`).
2. Import from the fixtures, never directly from `@playwright/test`:
   ```ts
   import { test, expect } from '../../src/fixtures';
   ```
3. Give it an ID and tags, and write it in named steps:
   ```ts
   test.describe('Home page', { tag: ['@ui', '@regression'] }, () => {
     test('UI-30 the logo links back home', async ({ page, homePage }) => {
       await test.step('Open the home page', () => homePage.goto());
       await test.step('Logo links to /', async () => {
         await expect(homePage.header.logo).toHaveAttribute('href', '/');
       });
     });
   });
   ```
4. Selectors go in a page object (`src/pages/`), not in the spec. Prefer `getByRole` → `getByLabel` →
   `getByTestId` → `getByText`; no XPath.
5. **API tests** go through `tests/api/support.ts`: `expectProducts(response)` for success,
   `expectApiError(response, 400)` for errors.
6. **Known site bug:** declare the test with
   `test.fail('UI-30 …', knownBug(<bug #>, '<what goes wrong>', '<text of the expected error>'), async (…) => { … })`. It gets the
   `@known-bug` tag and a link to the bug list, and shows red under "Known product bugs" in Allure.
   If it fails with any other error, Allure shows it as broken (a test problem), not as the bug.
7. No fixed sleeps: wait for a condition (`await expect(locator).toBeVisible()`).
8. Run `npm run lint`, `npm run typecheck` and your test before committing, and add it to
   `docs/test-plan.md`.

## Troubleshooting

| Symptom                                        | Cause and fix                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Executable doesn't exist` / browser not found | Run `npx playwright install --with-deps chromium`                                                |
| API tests fail with **403**                    | The API User-Agent was changed or blocked; check `API_USER_AGENT` in `.env` (README, User-Agent) |
| UI tests time out on page loads                | The shared QA site is slow or overloaded. Don't raise `--workers` above 2; rerun later           |
| UI-02, UI-09 and UI-27 show ✘; UI-28 skipped   | Expected: they check known bugs and count as passed (README, What is tested)                     |
| The Allure report shows old runs               | Local results add up; delete `allure-results/` before a run                                      |
| `npm run allure:open` shows nothing            | Run `npm run allure:generate` first                                                              |
| A test fails in CI but passes on your machine  | Run it in the CI image: `npm run test:docker -- -g "<test ID>"` ([Docker](#running-in-docker))   |
| CI lint fails on the Playwright image check    | Playwright was upgraded: set the same version in the `Dockerfile` and `ci.yml` image tags        |
