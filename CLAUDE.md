# Project: QA Automation Home Assignment – Playwright + TypeScript

## Assignment (original requirements)

### 1. UI test
- Use `E2EUI-Tests` as the User-Agent.
- Steps:
  1. Open https://qa.awarasleep.com/ → check that the page opens.
  2. Click the "Shop mattress" button on the Hero Banner → check we are on `/mattress`.
  3. Add the mattress to the cart → check the mattress has been added to the cart.

> The assignment text says `qa.awaraslep.com`, which doesn't resolve. The real host is
> `qa.awarasleep.com`. Cloudflare blocks the assignment's User-Agent `E2EUI-Tests` on the API, so
> all tests use **`E2EUI-Tests-Brands-CI`** (since 2026-11-22), which gets 200 JSON.

### 2. API test
- Base URL: https://api.qa-env.residenthome.com
- GET operations around the products flow:
  1. `/products?brand=awara` → `status.result.data` length > 0
  2. `/products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` → `status.result.data` length = 1
- For each step, check the response status is 200.

### 3. Additional task
1. Code in a GitHub repository.
2. README.md with clear instructions for running the tests.
3. A simple tool for presenting test results (Allure).
4. CI/CD with GitHub Actions: run tests on each commit; upload test artifacts (plus).

## Status
- [x] Part 2: API tests. 14 tests in `tests/api/`, passing. Assignment (`@smoke`): API-01 (non-empty,
  every product has brand awara), API-02 (exactly 1, and it is the-awara-hybrid-mattress-30).
  `@regression`: API-03..07 filter behaviour (`products-filters.spec.ts`), API-08 consistency between
  the two queries, API-09..11 negative cases (`products-negative.spec.ts`, also `@negative`). Checked
  against the real API on 2026-11-22: unknown/empty brand and missing brand → 400
  `{ status: "error", error }`; unknown name → 200 empty. Only GET is tested (user decision; POST/PUT/DELETE give 405). API
  findings (asserted as actual behaviour, annotated `finding`): brand is required even with name
  (API-05); lang has no effect and any value is accepted (API-06); brand ignores case but name doesn't
  (API-07a/b). Lists are capped at 200 items (`total_count` can be higher). They were quarantined
  while Cloudflare returned 403 for `E2EUI-Tests`; the quarantine was lifted after switching to
  `E2EUI-Tests-Brands-CI`.
- [x] Part 1: UI tests (explored first → `docs/exploration.md`). 17 tests in `tests/ui/`, passing
  locally (0 retries) and in CI. The assignment flow is the `@smoke` set (UI-01, UI-03,
  UI-13/14/15): "on /mattress" is read as "URL contains /mattress". UI-02 (exact path) is a
  `@regression` known bug. Reviewed and cut for the submission: UI-04 (cookie banner), UI-18 (add twice:
  two slow add-to-cart flows, unstable at 0 retries), UI-19/UI-20 (flaky cart +/remove, see README
  findings 3-4). Ask before adding or removing UI cases. Unused IDs:
  UI-04, UI-10, UI-11, UI-17, UI-18, UI-19, UI-20.
- The cart-via-API work for UI-19/UI-20 is in `git stash` ("wip: cart tests via API"). It isn't
  stable: an API write sent before the page's first `GET /carts/my` can land in a cart the page
  doesn't use. The cart is chosen by the `authentication` header (decoded `authToken` cookie), not
  by cookies, so `page.request` alone doesn't fix it.
- [x] Part 3.3: Allure reporting
- [x] Part 3.4: GitHub Actions CI/CD + artifacts + Allure on GitHub Pages
- [x] Part 3.2: README.md (missing items listed under "README must cover")
- [ ] Final review against the assignment

Update this checklist as parts are completed.

## Tech stack
- Playwright Test + TypeScript, Node 20+
- dotenv for config, zod for API response schema validation
- allure-playwright + Allure 3 CLI (Node package, no Java) for reporting, plus Playwright HTML report
- ESLint (flat config, typescript-eslint with type-aware linting) + Prettier
- Docker: CI test jobs (`api` and `ui`) run in `mcr.microsoft.com/playwright:v1.65.1-noble`; the
  `Dockerfile` builds on the same image for local runs (`npm run test:docker`). The tag must match
  `@playwright/test` in `package-lock.json` (`npm run check:playwright-image`, run in the CI `lint` job):
  when upgrading Playwright, update both tags.
- Playwright MCP (`.mcp.json`, pinned version, `--user-agent "E2EUI-Tests-Brands-CI"`) for exploring the app.
  Never used in CI.

## Project structure
```
.github/workflows/ci.yml      # CI pipeline
Dockerfile, .dockerignore     # local Docker runs on the CI Playwright image
allurerc.mjs                  # Allure 3 config (report name, history file)
scripts/ci-summary.mjs        # pass/fail counts per project for the CI run summary
scripts/mark-known-bugs.mjs   # marks @known-bug expected failures as failed before allure generate
scripts/check-playwright-image.mjs # Docker image tags in Dockerfile/ci.yml == locked Playwright version
docs/exploration.md           # UI exploration findings (locators, flakiness risks, bugs)
docs/test-plan.md             # test cases and IDs
docs/api-overview.md          # API notes (params, status codes, limits, response shape)
src/
  api/                        # API clients (one class per resource), extend BaseApi
  api/schemas/                # zod schemas + inferred TS types
  pages/                      # Page Objects, extend BasePage
  components/                 # reusable UI parts (Header, overlay handlers)
  data/                       # test data helpers (mattress catalog)
  utils/                      # small helpers (money formatting)
  fixtures/                   # custom fixtures; specs import test/expect from index.ts
  config/                     # env/config helpers (env.ts)
tests/
  api/                        # API specs (project `api`)
  ui/                         # UI specs (project `ui`)
```

## Configuration
- `playwright.config.ts`:
  - `use.userAgent: USER_AGENT` (`E2EUI-Tests-Brands-CI`) set globally (applies to the browser and
    API request context).
  - Projects: `api` (testDir `tests/api`, baseURL = API_URL) and `ui` (testDir `tests/ui`,
    baseURL = BASE_URL, Chromium, 1440×900, 90 s test timeout, 15 s expect timeout).
  - `fullyParallel`, 2 workers everywhere (with 3, tests time out on the shared QA site).
  - Reporters: `list`, `html` (open: never), `allure-playwright` (results in `allure-results/`).
  - `retries: 1` on CI, 0 locally (the CI summary counts pass-on-retry as flaky). `forbidOnly` on CI.
  - screenshot `only-on-failure`, video `retain-on-failure`, trace `retain-on-failure`.
- Env vars (`.env`, optional): `BASE_URL` (default https://qa.awarasleep.com), `API_URL` (default
  https://api.qa-env.residenthome.com), `USER_AGENT` (default `E2EUI-Tests-Brands-CI`).
  `.env.example` is committed and kept in sync; `.env` is not.

## Conventions

### General
- Specs import `test` and `expect` from `src/fixtures`, never directly from `@playwright/test`.
- Use `test.step()` for each assignment step so they show up in the Allure and HTML reports.
- Tags: `@api` / `@ui` (layer), `@smoke` / `@regression` (depth), `@cart` / `@header` (feature),
  `@negative` (API error handling), `@known-bug` (a `test.fail()` test for a known site bug),
  `@quarantine` (a test blocked by the environment: add the tag and `test.fixme` with the reason;
  none right now).
- Tests are independent and can run in parallel.
- Every promise must be awaited (`@typescript-eslint/no-floating-promises` is on).
- No hard waits (`waitForTimeout`), no secrets in code, no commented-out code.
- **Never weaken or change an assertion just to make a test pass.** If a test fails, report whether
  it's a test problem or a real bug.
- Known site bugs: keep the strict assertion and declare the test with
  `test.fail(title, knownBug(<bug #>, '<description>'), body)` (`src/fixtures/knownBug.ts`): it adds
  the `@known-bug` tag, a `known bug` annotation pointing to `docs/exploration.md` and an `issue`
  link to its "Possible bugs" section.
- Keep assignment tests clearly separate from any extra tests (put extras in their own `describe`).

### API
- Verify the real response shape before writing schemas. Don't guess the path to `data`: the
  assignment writes `status.result.data`, but the real body is
  `{ "status": "ok", "result": { "data": [...] } }`, so tests check `result.data`. This is
  documented in the README.
- API clients are thin and typed, use Playwright `request` with `params` (no string-built URLs),
  and return the raw `APIResponse`. Assertions live in tests.
- Every API test goes through `tests/api/support.ts`: `expectProducts` (200 → JSON Content-Type →
  products schema) or `expectApiError` (expected 4xx → JSON → error schema), then its own
  assertions.
- When the API behaves differently from what we'd expect, assert the actual behaviour and add a
  `finding` annotation; don't leave a test red on purpose.

### UI
- Page Object Model: locators as `readonly` fields, methods are user actions (`addToCart()`,
  `selectSize()`). No assertions inside page objects, except for readiness checks and retry waits
  (`waitUntilReady()`).
- Locator priority: `getByRole` (with name) → `getByLabel` → `getByTestId` → `getByText`.
  No XPath, no long CSS chains. Scope locators (e.g. inside the hero banner) when text isn't unique.
- Use web-first assertions (`toBeVisible`, `toHaveURL`, `toHaveText`, `toHaveCount`).
- Overlays (cookie banner, promo and protection-plan modals) are dismissed by the `page` fixture,
  not ad hoc in tests. Opt out per test with `test.use({ autoDismissOverlays: [...] })`.
- Expected prices come from the catalog API (`mattressCatalog` fixture), not hard-coded values.
- Verify "added to cart" with several signals: add-to-cart API response, the cart line item
  (name, size, price, quantity) and the header cart counter.
- Use `docs/exploration.md` as the source of truth for locators and flakiness risks.

## Reporting
- `npm run allure:generate` → `allure-report/`; `npm run allure:open`. Config in `allurerc.mjs`.
- Known bugs: `allure:generate` first runs `scripts/mark-known-bugs.mjs`, which marks `@known-bug`
  results that failed as expected as `failed` (message prefixed "Known bug (expected failure)") and
  adds a `knownBug` label (`expected-failure` / `no-longer-reproduces`). The categories in
  `allurerc.mjs` ("Known product bugs", "Known bug no longer reproduces") and `ci-summary.mjs`'s
  `known bug` column match on that label.
- Allure history lives in `history.jsonl` (git-ignored). In CI it's kept with the published report.
- On UI failure: screenshot, video and trace attached.
- `allure-results/`, `allure-report/`, `playwright-report/` and `test-results/` are gitignored.

## CI/CD (`.github/workflows/ci.yml`)
- Triggers: push to any branch, pull requests from forks, **nightly** (`schedule`, 03:00 UTC, on
  `main`), and **manual** `workflow_dispatch` with inputs `project` (all/api/ui) and `grep` (tag or
  title filter; `--pass-with-no-tests` when set). Manual: Actions tab → CI → Run workflow, or
  `gh workflow run ci.yml --ref <branch> -f project=ui -f grep=@smoke`. Runs code already on GitHub;
  uncommitted changes can only run locally.
- Concurrency: push/PR runs cancel older runs on the same branch. Push to `main` and nightly share
  one group (`publish-main`) so they never publish the Allure history at the same time: a push
  cancels a run in progress, a nightly waits (a newer pending run replaces an older pending one).
  Manual runs get a group per run and are never cancelled.
- Publishing to Pages and Allure history: only push to `main` and nightly (`PUBLISH` env), so a
  filtered manual run never replaces the full report.
- Jobs: `lint` (lint + typecheck + Playwright image tag check) → `test` matrix (`api`, `ui`;
  fail-fast false; both in the Playwright `container:` with `--ipc=host`, Node from the image, no
  setup-node or browser install, bash as the shell) → `report` (always after lint passed: merge both projects' `allure-results`, restore
  `history.jsonl` from the published report on `main`, generate Allure, write pass/fail/flaky counts
  per project to the run summary with `scripts/ci-summary.mjs`) → `publish-report` (deploy to
  GitHub Pages for push to `main` and nightly, even when tests fail): https://ananobb.github.io/Ashley/
- Artifacts (14-day retention): `allure-results-<project>`, `playwright-report-<project>`,
  `test-results-<project>`, `allure-report`.
- After pushing, watch the run (`gh run watch`) and report the result.

## Commands
- `npm ci` / `npx playwright install --with-deps chromium`
- `npm run lint` (ESLint + Prettier check) / `npm run lint:fix` / `npm run typecheck`
- `npm test` – all tests; `npm run test:smoke` – the assignment only; `npm run test:api` /
  `npm run test:ui` – one project
- `npx playwright test --grep @smoke` – by tag
- `npm run test:ui -- --headed --workers=1` – watch UI tests one by one
- `npm run test:docker` (extra args go to `playwright test`) – run in the CI image; mounts the
  project, keeps a separate Linux `node_modules` volume, passes `BASE_URL`/`API_URL`/`USER_AGENT`
  (`.env` isn't in the image)
- `npm run report:html` – Playwright HTML report
- `npm run allure:generate` / `npm run allure:open`
- After any code change: run lint, typecheck and the relevant tests before saying you're done.

## Git
- Conventional commits (`chore:`, `test:`, `ci:`, `docs:`, `fix:`, `refactor:`).
- One logical change per commit. Commit and push only when asked.
- Work on a feature branch (`<type>/<short-name>`, e.g. `fix/ui-08-menu-retry`) and open a PR to
  `main`; never push straight to `main`. Merge only when the user says so (rebase merge, so the
  commits stay separate), delete the branch, then watch the `main` run.
- On a PR from this repo, the tests run through the `push` event; the `pull_request` run shows
  skipped jobs on purpose (it only runs for forks). Check the push run's result.
- Never commit `.env`, reports or test results.

## README must cover
CI badge + live Allure link, overview, tech stack, prerequisites, install, run commands
(all / API / UI / headed / single test / tag), reports, CI/CD and where to find artifacts,
structure + design decisions, assumptions and findings (actual `data` path, bugs, Cloudflare and
the User-Agent), AI usage (short and honest). Every command in it must work in a clean clone.
All covered as of 2026-11-22. The "AI usage" section is written in the author's voice: the user owns
its wording.

## Planned (not built yet)
- Allure environment info: base URLs, browser, Node version, User-Agent.
- Scripts: `format`, `allure:serve`.
