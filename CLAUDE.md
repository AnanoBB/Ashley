# Project: QA Automation Home Assignment – Playwright + TypeScript

## Assignment
1. **UI** (User-Agent `E2EUI-Tests`): open https://qa.awarasleep.com/ → click "Shop mattress" in the
   hero → on `/mattress` → add the mattress to the cart → it is in the cart.
2. **API** (https://api.qa-env.residenthome.com, GET, status 200 each):
   `/products?brand=awara` → `status.result.data` length > 0;
   `/products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` → length = 1.
3. **Extra:** GitHub repo, README with run instructions, Allure report, GitHub Actions on each
   commit with artifacts.

Deviations (documented in the README):
- The assignment's host `qa.awaraslep.com` doesn't resolve; the real one is `qa.awarasleep.com`.
- Cloudflare blocks `E2EUI-Tests` on the API, so the `api` project uses `E2EUI-Tests-Brands-CI`
  (`API_USER_AGENT`, since 2026-11-22). The browser and the catalog call keep `E2EUI-Tests`
  (`UI_USER_AGENT`): the website accepts it.
- The real body is `{ "status": "ok", "result": { "data": [...] } }`, so tests check `result.data`.

## Status
- [x] API: 14 tests in `tests/api/`. `@smoke` = API-01/02 (assignment). `@regression`: API-03..07
  filters, API-08 consistency, API-09..11 negative (`@negative`). Only GET is tested (user decision;
  POST/PUT/DELETE give 405). Findings, asserted as actual behaviour with a `finding` annotation:
  brand is required even with name (API-05); lang has no effect (API-06); brand ignores case, name
  doesn't (API-07a/b). Lists are capped at 200 items (`total_count` can be higher).
- [x] UI: 19 tests in `tests/ui/`, explored first (`docs/exploration.md`). `@smoke` = UI-01, UI-03,
  UI-13 (UI-14/15 are its steps); "on /mattress" means the path is `/mattress` or `/mattresses/…`
  (`MATTRESS_URL`). UI-02 (exact path) is a `@known-bug`. UI-25 (404) and UI-26 (stubbed failed
  add-to-cart, finding #29) are `@negative`. Cut for the submission: UI-04 (the fixtures close the
  popups in every test), UI-18, UI-19, UI-20 (flaky, see README findings 4-5). UI-22 also covers
  UI-24. Planned but not automated: UI-10, 11, 17, 23.
  **Ask before adding or removing UI cases.**
- [x] Allure, [x] CI/CD + artifacts + Pages, [x] README
- [x] Final review against the assignment (2026-11-23)

Update this checklist as parts are completed.

## Stack
Playwright Test + TypeScript (Node 22+, CI on 24), dotenv, zod, allure-playwright + Allure 3 CLI (no Java),
ESLint (type-aware, `--max-warnings 0`) + Prettier. CI test jobs and the local `Dockerfile` use
`mcr.microsoft.com/playwright:v<version>-noble`; the tag must match `@playwright/test` in
`package-lock.json` (`npm run check:playwright-image`). Update both when upgrading Playwright.
Playwright MCP (`.mcp.json`) is for exploring the app only, never in CI.

Layout: `src/` (api clients + zod schemas, pages, components, fixtures, data, utils, config),
`tests/api`, `tests/ui`, `scripts/` (CI summary, known-bug marking, image tag check), `docs/`
(exploration, test plan, API overview). Config: `playwright.config.ts`, `allurerc.mjs`,
`.env.example` (keep in sync; `.env` is not committed).

## Conventions
- Specs import `test`/`expect` from `src/fixtures`, never from `@playwright/test`.
- `test.step()` for each assignment step. Tests are independent and parallel-safe.
- Tags: `@api`/`@ui`, `@smoke`/`@regression`, `@cart`/`@header`, `@negative`, `@known-bug`,
  `@quarantine` (env-blocked: tag + `test.fixme` with the reason; none now).
- Await every promise. No `waitForTimeout`, no secrets, no commented-out code.
- **Never weaken or change an assertion to make a test pass.** Report whether a failure is a test
  problem or a real bug.
- Known site bug: keep the strict assertion, use
  `test.fail(title, knownBug(<#>, '<desc>', '<text of the expected error>'), body)`
  (`src/fixtures/knownBug.ts`). The expected error must be specific to the bug (e.g. the wrong URL
  it lands on), not just the matcher name. Any other failure is reported as broken by
  `mark-known-bugs.mjs`, and `--strict` (CI test job) fails the job.
- Keep assignment tests in their own `describe`, apart from extras.

### API
- Verify the real response shape before writing schemas.
- Clients are thin and typed, extend `BaseApi`, pass `params` (no string-built URLs), return the raw
  `APIResponse`. Assertions live in tests.
- Every test goes through `tests/api/support.ts` (`expectProducts` / `expectApiError`), then its
  own assertions. Shared test data (`BRAND`, `PRODUCT_NAME`) lives there too.
- Unexpected API behaviour: assert the actual behaviour and add a `finding` annotation.

### UI
- Page Object Model: `readonly` locator fields, methods are user actions. No assertions in page
  objects except readiness checks and retry waits.
- Locators: `getByRole` (with name) → `getByLabel` → `getByTestId` → `getByText`. No XPath or long
  CSS chains; scope locators when text isn't unique. Web-first assertions only.
- The `page` fixture blocks Dynamic Yield scripts (the promo popup), pre-sets the cookie consent and
  dismisses overlays (cookie banner fallback, protection plan).
- Expected prices come from the catalog API (`mattressCatalog` fixture), not hard-coded.
- "Added to cart" = add-to-cart API response + cart line item (name, size, price, qty) + header
  counter.
- `docs/exploration.md` is the source of truth for locators and flakiness risks.

## Reporting
`npm run allure:generate` runs `scripts/mark-known-bugs.mjs` first: expected `@known-bug` failures
become `failed` with a `knownBug` label, which the `allurerc.mjs` categories and `ci-summary.mjs`
match on; a failure without the expected error becomes `broken`. Allure environment info (URLs,
User-Agents, browser, Node) comes from `playwright.config.ts`. History is in `history.jsonl` (git-ignored; kept with the published report in CI).

## CI/CD (`.github/workflows/ci.yml`)
- Runs on push (any branch), fork PRs, nightly (03:00 UTC, `main`) and manual `workflow_dispatch`
  (`project`, `grep`): `gh workflow run ci.yml --ref <branch> -f project=ui -f grep=@smoke`.
- Jobs: `lint` → `test` (matrix `api`/`ui` in the Playwright container) → `report` (merged Allure +
  run summary) → `publish-report` (GitHub Pages, only push to `main` and nightly):
  https://ananobb.github.io/Ashley/
- `retries: 1`, in CI and locally (pass-on-retry counted as flaky). 2 workers (3 time out on QA).
- After pushing, watch the run (`gh run watch`) and report the result. On a PR from this repo, check
  the `push` run; the `pull_request` run skips jobs on purpose (forks only).

## Commands
`npm test` / `test:smoke` / `test:api` / `test:ui` / `test:docker`, `npm run lint` / `typecheck`,
`npm run allure:generate` / `allure:open`, `npm run test:scripts` (report-script unit tests).
After any code change, run lint (no warnings allowed), typecheck and the relevant tests before
saying you're done.

## Git
- Conventional commits, one logical change per commit. Commit and push only when asked.
- Feature branch (`<type>/<short-name>`) + PR to `main`; never push to `main`. Merge only when the
  user says so (rebase merge), delete the branch, then watch the `main` run.
- Never commit `.env`, reports or test results.

## README
Must cover: CI badge + Allure link, overview, stack, prerequisites, install, run commands, reports,
CI/CD + artifacts, structure + design decisions, findings, AI usage. Keep it short; details go to
`docs/ci.md` and `docs/development.md`. Every command must work in a
clean clone. The "AI usage" section is in the author's voice: the user owns its wording.

## Planned
Scripts `format`, `allure:serve`.
