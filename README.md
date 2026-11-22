# Awara QA Automation

[![CI](https://github.com/AnanoBB/Ashley/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AnanoBB/Ashley/actions/workflows/ci.yml)

Automated tests for the **Awara** mattress store (QA environment): its **products API** and its
**website** (home page → product page → cart). Built with **Playwright + TypeScript**, reported with
**Allure**, and run by **GitHub Actions** on every push and every night.

**Latest test report:** https://ananobb.github.io/Ashley/ (updated after every push to `main` and
every nightly run)

---

## Contents

1. [What this project does](#1-what-this-project-does)
2. [Quick start](#2-quick-start)
3. [What is tested](#3-what-is-tested)
4. [How it works](#4-how-it-works)
5. [Running tests](#5-running-tests)
6. [Reading the results](#6-reading-the-results)
7. [CI: automatic, nightly and manual runs](#7-ci-automatic-nightly-and-manual-runs)
8. [Project structure](#8-project-structure)
9. [Adding a test](#9-adding-a-test)
10. [Design decisions](#10-design-decisions)
11. [Findings (bugs and API behaviour)](#11-findings-bugs-and-api-behaviour)
12. [User-Agent](#12-user-agent)
13. [Troubleshooting](#13-troubleshooting)
14. [AI usage](#14-ai-usage)
15. [What I'd add next](#15-what-id-add-next)

---

## 1. What this project does

The home assignment asked for:

| Part     | Requirement                                                                                                                                                             | Where                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| UI test  | Open the site → click "Shop mattress" in the hero banner → check we're on `/mattress` → add the mattress to the cart → check it's in the cart. User-Agent `E2EUI-Tests` | `tests/ui/`           |
| API test | `GET /products?brand=awara` returns data; `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns exactly 1 item; every response is 200           | `tests/api/`          |
| Extras   | GitHub repo, README, a test report tool (Allure), CI on every commit with artifacts                                                                                     | this repo, `.github/` |

On top of the assignment there are **regression tests** (more UI paths, API filter behaviour and
negative cases), a **nightly full run**, and a published **Allure report with history**.

| System  | Address                               |
| ------- | ------------------------------------- |
| Website | `https://qa.awarasleep.com`           |
| API     | `https://api.qa-env.residenthome.com` |

> The assignment's website address `qa.awaraslep.com` is a typo and doesn't exist; the real one is
> `qa.awarasleep.com`.

## 2. Quick start

You need **Node.js 20 or newer** (`node -v`). Java is **not** needed: the Allure CLI is a Node package.

```bash
git clone https://github.com/AnanoBB/Ashley.git
cd Ashley
npm ci                                        # install dependencies
npx playwright install --with-deps chromium   # download the browser for UI tests
npm run test:smoke                            # run exactly the assignment (5 tests, ~30 s)
```

Then open a report: `npm run report:html` (Playwright) or `npm run allure:generate && npm run allure:open`
(Allure).

Optional: `cp .env.example .env` to override the addresses or the User-Agent
([see below](#environment-variables)).

## 3. What is tested

**34 tests: 17 API + 17 UI.** Each test has an ID (e.g. `API-01`, `UI-13`) at the start of its name, so
you can find it in the reports and run it alone. Tags say what kind of test it is:

| Tag                | Meaning                                             | Count |
| ------------------ | --------------------------------------------------- | ----- |
| `@smoke`           | The assignment itself                               | 5     |
| `@regression`      | Everything beyond the assignment                    | 29    |
| `@api`, `@ui`      | Which layer                                         | 17/17 |
| `@negative`        | API error handling (bad input, unsupported methods) | 8     |
| `@cart`, `@header` | UI feature area                                     |       |
| `@known-bug`       | Checks a known site bug, expected to fail           | 2     |

### 3.1 API tests (`tests/api/`)

Every API test checks, in this order: **status code → `Content-Type: application/json` → the body
matches a zod schema** (required fields with the right types), then its own assertions. The one
exception is API-12: the 405 body is plain text, so it checks status → `text/plain` → the text.

**Assignment (`@smoke`)**

| ID     | Request                                                               | Checks                                                               |
| ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| API-01 | `GET /products?brand=awara`                                           | 200, at least one product, and **every** product has brand `awara`   |
| API-02 | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` | 200, exactly 1 product, and it **is** `the-awara-hybrid-mattress-30` |

> **About `status.result.data`:** the assignment writes the path that way, but the real response is
> `{ "status": "ok", "result": { "total_count", "count_by_category", "data": [...] } }`. `status` is
> a string next to `result`, so the tests check `status === "ok"` and read `result.data`.

**Filter behaviour and consistency (`@regression`)**

| ID      | Checks                                                                                        |
| ------- | --------------------------------------------------------------------------------------------- |
| API-03  | Unknown brand → **400** with an error naming the brand                                        |
| API-04  | Unknown product name → 200 with an empty list                                                 |
| API-05  | Name without brand → **400** "missed brand values" (brand is required)                        |
| API-06  | `lang=es`, `fr` or an invalid `xx` returns the same body as `lang=en` (lang has no effect)    |
| API-07a | Brand filter ignores case: `brand=AWARA` = `brand=awara`                                      |
| API-07b | Name filter is case-sensitive: an uppercase name finds nothing                                |
| API-08  | The product found by name matches its entry in the brand list (id, name, title, brand, price) |

**Negative cases (`@regression @negative`)**

| ID     | Checks                                                                                      |
| ------ | ------------------------------------------------------------------------------------------- |
| API-09 | No query parameters → 400                                                                   |
| API-10 | Empty brand (`brand=`) → 400                                                                |
| API-11 | A name with SQL-like characters, 3000 characters, or an empty value → 200, empty, never 5xx |
| API-12 | `POST`, `PUT`, `DELETE /products` → 405 "Defined methods: GET"                              |

Where the API behaves differently than you might expect (API-05, 06, 07b), the test asserts what the
API **actually** does and carries a `finding` note, visible in the report. See
[Findings](#11-findings-bugs-and-api-behaviour).

### 3.2 UI tests (`tests/ui/`, Chromium)

**Assignment flow (`@smoke`)**

| ID          | Checks                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-01       | The home page opens: URL, title, hero heading and logo                                                                                                                                            |
| UI-03       | Hero "Shop Mattress" → the URL contains `/mattress` and a real mattress page is shown                                                                                                             |
| UI-13/14/15 | The whole flow: home → hero "Shop Mattress" → Add to Cart. Checks the add-to-cart API call (200, 1 item), the cart line (name, size, price, quantity), the cart total and the header cart counter |

> **"Check we are on `/mattress`":** the hero button really goes to
> `/mattresses/essential-latex-hybrid-mattress`. The tests read the requirement as "the URL contains
> `/mattress`" (UI-03, UI-13). The exact page `/mattress` is a _different_ product (Classic Hybrid),
> so the exact check is a separate test, UI-02, reported as a finding.

**Extra coverage (`@regression`)**

| ID       | Checks                                                                       |
| -------- | ---------------------------------------------------------------------------- |
| UI-02    | Hero goes to exactly `/mattress`. **Known bug**, expected to fail            |
| UI-05    | Hovering "Mattresses" in the header opens the menu with all 3 mattresses     |
| UI-06 ×3 | Each menu card opens its product page                                        |
| UI-07 ×3 | Each card's "from $X+" price equals the cheapest size on the product page    |
| UI-08    | "Shop All Mattresses" opens `/mattresses` with all 3 mattresses              |
| UI-09    | Header "Mattresses" link opens the listing. **Known bug**, expected to fail  |
| UI-12    | Product page defaults to Queen with the right price; Add to Cart is enabled  |
| UI-16    | Choosing King updates the price, and King at the King price reaches the cart |
| UI-21    | The cart survives a page reload                                              |
| UI-22    | A new browser starts with an empty cart                                      |

Expected prices are **not** hard-coded. At the start of a run the tests load the real prices from the
store's catalog API and compare the website against them.

> **"Expected to fail":** UI-02 and UI-09 check real bugs. They are marked `test.fail()`, so they
> **pass** while the bug exists and turn **red** when someone fixes it, which tells us to update the
> test. They show a ✘ in the terminal output; that's normal. In the **Allure report** they show
> **red** under the **Known product bugs** category (tag `known-bug`, with a link to the bug list), so
> they are never hidden among the passes, while CI stays green.

## 4. How it works

```
                 playwright.config.ts  (User-Agent, URLs, 2 workers, retries, reporters)
                            │
           ┌────────────────┴─────────────────┐
     project "api"                       project "ui" (Chromium)
     tests/api/*.spec.ts                 tests/ui/*.spec.ts
           │                                   │
     src/fixtures  ── gives each test ready-made objects ──┐
           │                                   │            │
     src/api/ProductsApi                 src/pages/*Page,  src/data/mattresses
     (sends HTTP requests)               src/components/   (expected prices from
           │                             (click, type, read)  the catalog API)
           ▼                                   ▼
  api.qa-env.residenthome.com          qa.awarasleep.com
           │                                   │
           └──────────► results ◄──────────────┘
                 allure-results/, playwright-report/, test-results/ (failures)
```

- **Specs** (`tests/`) describe _what_ to check, in readable steps (`test.step()`), and hold the
  assertions.
- **API clients** (`src/api/`) only send requests and return the raw response. **Schemas**
  (`src/api/schemas/`) describe what a valid response looks like.
- **Page objects** (`src/pages/`, `src/components/`) know _how_ to find and use things on the page
  (buttons, prices, the cart). Specs never contain selectors.
- **Fixtures** (`src/fixtures/`) create those objects for each test and handle shared setup, such as
  closing random popups (cookie banner, promo, protection plan) automatically.
- **Config** (`src/config/env.ts`) holds the addresses and the User-Agent, with defaults you can
  override.

## 5. Running tests

| Command                                     | What it runs                                            |
| ------------------------------------------- | ------------------------------------------------------- |
| `npm test`                                  | Everything (34 tests, ~3 min)                           |
| `npm run test:smoke`                        | The assignment only (5 tests)                           |
| `npm run test:api`                          | API tests only (~5 s)                                   |
| `npm run test:ui`                           | UI tests only                                           |
| `npm run test:ui -- --headed --workers=1`   | UI tests in a visible browser, one at a time (to watch) |
| `npx playwright test tests/ui/home.spec.ts` | One file                                                |
| `npx playwright test -g "UI-13"`            | One test, by ID or part of its name                     |
| `npx playwright test --grep @negative`      | By tag                                                  |
| `npx playwright test --ui`                  | Playwright's UI mode: pick tests, step through them     |
| `npm run lint` / `npm run lint:fix`         | ESLint + Prettier check / fix                           |
| `npm run typecheck`                         | TypeScript check                                        |

### Environment variables

All optional. Put them in a `.env` file (copy `.env.example`) or in front of a command.

| Variable     | Default                               | Purpose                               |
| ------------ | ------------------------------------- | ------------------------------------- |
| `BASE_URL`   | `https://qa.awarasleep.com`           | Website under test                    |
| `API_URL`    | `https://api.qa-env.residenthome.com` | API under test                        |
| `USER_AGENT` | `E2EUI-Tests-Brands-CI`               | Sent by the browser and the API calls |

Example: `USER_AGENT=E2EUI-Tests npm run test:api`.

## 6. Reading the results

| Report              | How to open                                                                                                    | Best for                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Allure**          | `npm run allure:generate`, then `npm run allure:open`; or the [live report](https://ananobb.github.io/Ashley/) | Overview, steps, history and trends, `known bug` / `finding` notes |
| **Playwright HTML** | `npm run report:html`                                                                                          | Debugging one failure: error, screenshot, video, trace             |
| **Trace viewer**    | `npx playwright show-trace test-results/<test>/trace.zip`                                                      | Replaying a failed UI test action by action, with network calls    |

- Every test is split into named steps, so the reports read like the test plan.
- A failed UI test keeps a **screenshot, video and trace** in `test-results/`.
- Locally, Allure results add up across runs until you delete `allure-results/`.
- **Known bugs in Allure:** Playwright counts an expected failure as a pass, and the Allure reporter
  would show it green. `npm run allure:generate` first runs `scripts/mark-known-bugs.mjs`, which marks
  `@known-bug` tests that failed as expected as **failed** ("Known bug (expected failure): …"). Allure
  groups them under **Categories → Known product bugs**, apart from real failures ("Product errors").
  If a known bug stops reproducing, the test shows under **Known bug no longer reproduces**. The CI
  run summary has its own `known bug` column.

## 7. CI: automatic, nightly and manual runs

The pipeline lives in `.github/workflows/ci.yml`.

### When it runs

| Trigger                     | What runs                                    | Publishes the report |
| --------------------------- | -------------------------------------------- | -------------------- |
| Push to any branch          | All tests                                    | Only on `main`       |
| **Nightly**, 03:00 UTC      | **Full regression**: all 34 tests, on `main` | Yes                  |
| **Manual** ("Run workflow") | All tests, or the project/filter you choose  | No                   |
| Pull request from a fork    | All tests                                    | No                   |

### Running it manually (no commit needed)

Runs code that is already on GitHub, on any branch.

- **On GitHub:** **Actions** → **CI** → **Run workflow** → pick the branch, `project` (`all` / `api`
  / `ui`) and an optional `grep` filter (`@smoke`, `@negative`, `UI-13`, …).
- **From a terminal** (GitHub CLI): `gh workflow run ci.yml --ref main -f project=ui -f grep=@smoke`

Uncommitted local changes can't run on GitHub; run them locally with `npm test`.

### What happens in a run

```
lint ──► test (api) ──┐
     └─► test (ui) ───┴─► report ──► publish-report
```

| Job                   | What it does                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lint`                | ESLint, Prettier and TypeScript checks. Tests only start if this passes.                                                                               |
| `test (api)` / `(ui)` | One job per project, in parallel. Both always finish, even if the other fails. Chromium is installed only for UI.                                      |
| `report`              | Merges both projects' results into one Allure report, adds the history, and writes pass / fail / flaky / known bug counts to the run's **Summary** tab |
| `publish-report`      | Puts the report on [GitHub Pages](https://ananobb.github.io/Ashley/), even when tests fail (push to `main` and nightly only)                           |

### Artifacts

Download from the run page → **Artifacts** (kept 14 days), or `gh run download <run-id> -n <name>`.

| Artifact                                         | Contents                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `allure-report`                                  | The merged Allure report                                                |
| `allure-results-api` / `allure-results-ui`       | Raw Allure results per project                                          |
| `playwright-report-api` / `playwright-report-ui` | Playwright HTML report per project                                      |
| `test-results-api` / `test-results-ui`           | Traces, videos and screenshots of failures (only when something failed) |

### Other rules

- **Retries:** 1 in CI, 0 locally. A test that passes only on the retry is counted as **flaky** in the
  summary, so it stays visible.
- **Cancelling:** a newer push to the same branch cancels the older run. On `main`, pushes and the
  nightly run share one queue so they don't overwrite each other's report history: a push cancels
  a run in progress, a nightly waits for it. Manual runs are never cancelled.
- **Allure history:** push-to-`main` and nightly runs download the previous `history.jsonl` from the
  published report and publish the updated one, so the report shows trends over time.
- **Notifications:** GitHub emails you when a run you started fails, and the nightly failure goes to
  whoever last changed its schedule. Settings: https://github.com/settings/notifications → Actions.

## 8. Project structure

```
.github/workflows/ci.yml   CI pipeline (triggers, jobs, artifacts, Pages)
playwright.config.ts       User-Agent, URLs, projects (api / ui), workers, retries, reporters
allurerc.mjs               Allure report name, history file and the known-bug categories
.env.example               Optional settings (copy to .env)

src/
  config/env.ts            Addresses and User-Agent, read from env vars with defaults
  api/                     API clients: send requests, return raw responses (BaseApi, ProductsApi, CatalogApi)
  api/schemas/             zod schemas: what a valid products / catalog / cart / error response looks like
  pages/                   Page objects: HomePage, ProductPage, CartPage, MattressesPage
  components/              Shared UI parts: Header (menu), popup handlers
  data/mattresses.ts       The 3 mattresses (routes, test ids) + prices loaded from the catalog API
  fixtures/                Ready-made objects for tests, plus `knownBug()`; specs import from here
  utils/money.ts           Price formatting ($1,199)
  utils/regexp.ts          Escapes text for use in a RegExp

tests/
  api/products.spec.ts             API-01, 02 (assignment) and API-08 (consistency)
  api/products-filters.spec.ts     API-03 … 07 (filter behaviour)
  api/products-negative.spec.ts    API-09 … 12 (negative cases)
  api/support.ts                   Shared checks: status → Content-Type → schema
  ui/home.spec.ts                  UI-01, 02, 03
  ui/cart.spec.ts                  UI-12 … 22 (product page and cart, incl. the assignment flow)
  ui/header-mattresses.spec.ts     UI-05 … 09 (header menu)

scripts/ci-summary.mjs     Writes the pass / fail / flaky / known bug table for CI
scripts/mark-known-bugs.mjs Marks @known-bug expected failures as failed for Allure
docs/
  exploration.md           What was found exploring the site: locators, popups, 28 possible bugs
  test-plan.md             Scope, all test cases with priorities, risks
  api-overview.md          API notes: parameters, status codes, limits, response shape
```

## 9. Adding a test

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
   `expectApiError(response, 400)` for JSON errors, `expectTextError(response, 405)` for plain-text
   errors.
6. **Known site bug:** declare the test with
   `test.fail('UI-30 …', knownBug(<bug #>, '<what goes wrong>'), async (…) => { … })`. It gets the
   `@known-bug` tag and a link to the bug list, and shows red under "Known product bugs" in Allure.
7. No fixed sleeps: wait for a condition (`await expect(locator).toBeVisible()`).
8. Run `npm run lint`, `npm run typecheck` and your test before committing, and add it to
   `docs/test-plan.md`.

## 10. Design decisions

| Decision                                                                                        | Why                                                                                                                               |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Every API test: status → JSON Content-Type → zod schema → its own assertion                     | A schema failure points at a broken contract; the assignment checks stay short and readable                                       |
| Checked the real responses before writing schemas                                               | That's how the real `result.data` path and the website typo were found                                                            |
| When the API behaves unexpectedly, assert what it does and add a `finding` note                 | The behaviour is documented and guarded; a deliberately red test would just be noise                                              |
| Known site bugs: keep the strict assertion, mark the test `test.fail()` with a `known bug` note | The bug stays visible (red in Allure) without failing CI, and the test tells us when it's fixed                                   |
| Expected prices come from the catalog API                                                       | Prices and sales change; the test compares the website with the source of truth                                                   |
| Popups are closed by a fixture                                                                  | They appear at random times; tests stay about behaviour, and a test can opt out to test a popup itself                            |
| No fixed sleeps; every wait is a timeout on a specific condition                                | The QA site is slow (the buy box and header menu can take 20 s or more), and waits end as soon as the condition is true           |
| Page objects with role / label / test id locators, no XPath                                     | Locators read like the page and survive layout changes                                                                            |
| 2 parallel browsers, 1 retry in CI, 0 locally                                                   | The shared QA site times out with 3 or more browsers; 2 is stable and faster. A retry never hides a failure: it shows up as flaky |
| Unstable tests are removed, not retried until green                                             | A test that fails at random teaches people to ignore red builds                                                                   |
| User-Agent set once, overridable with `USER_AGENT`                                              | One place to change it for both the browser and the API calls                                                                     |
| A filtered manual CI run never replaces the published report                                    | The live report always shows a full run                                                                                           |
| Never weaken an assertion to make a test pass                                                   | Every failure is reported as either a test problem or a site bug                                                                  |

## 11. Findings (bugs and API behaviour)

**Website**

| #   | Finding                                                                                                                            | Evidence                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Hero "Shop Mattress" goes to `/mattresses/essential-latex-hybrid-mattress` (Essential Hybrid), while `/mattress` is Classic Hybrid | UI-02 (expected to fail), `docs/exploration.md` #1                                   |
| 2   | Header "Mattresses" opens `/mattress` (one product) instead of the `/mattresses` listing                                           | UI-09 (expected to fail), `docs/exploration.md` #13                                  |
| 3   | Cart: the protection-plan dialog opens a few seconds after landing on the cart and can swallow a click made at that moment         | CI trace: the remove click ran while the dialog opened; no cart request was sent     |
| 4   | Cart: an item removed while the page is still applying the auto-coupon can reappear on the page although the server deleted it     | Trace: `DELETE /carts/my/items/{id}` returned 200, the next quote still had the item |

Findings 3 and 4 made tests for the cart "+" and "remove" buttons fail at random, so those tests are
left out rather than retried until green; "add the same mattress twice" is left out for the same
reason. `docs/exploration.md` lists 28 possible bugs in total (broken images, inconsistent prices,
accessibility issues and more).

**API**

| #   | Finding                                                                                                   | Test                           |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 5   | `brand` is required: a name alone gets 400 "missed brand values"                                          | API-05                         |
| 6   | `lang` has no effect: `es`, `fr` and invalid values return the same body as `en`; `translations` is empty | API-06                         |
| 7   | Inconsistent case handling: `brand=AWARA` works, an uppercase `name` finds nothing                        | API-07b                        |
| 8   | Lists are capped at 200 items while `total_count` can be higher (e.g. brand `nectar`: 1025)               | API-07a, API-08 (precondition) |
| 9   | The assignment's User-Agent `E2EUI-Tests` is blocked by Cloudflare (403)                                  | [User-Agent](#12-user-agent)   |

## 12. User-Agent

The assignment asks for `E2EUI-Tests`. With it, Cloudflare in front of
`api.qa-env.residenthome.com` answers every request with **403 (an HTML block page)**, so both API
tests fail on the status check. The company provided **`E2EUI-Tests-Brands-CI`** for these tests;
with it the API returns 200 JSON and the tests pass with their assertions unchanged. It's the
default in `src/config/env.ts`, and `USER_AGENT=E2EUI-Tests npm run test:api` reproduces the original 403.

## 13. Troubleshooting

| Symptom                                        | Cause and fix                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Executable doesn't exist` / browser not found | Run `npx playwright install --with-deps chromium`                                                  |
| API tests fail with **403**                    | The User-Agent was changed or blocked; check `USER_AGENT` in `.env` ([User-Agent](#12-user-agent)) |
| UI tests time out on page loads                | The shared QA site is slow or overloaded. Don't raise `--workers` above 2; rerun later             |
| UI-02 and UI-09 show ✘                         | Expected: they check known bugs and count as passed ([3.2](#32-ui-tests-testsui-chromium))         |
| The Allure report shows old runs               | Local results add up; delete `allure-results/` before a run                                        |
| `npm run allure:open` shows nothing            | Run `npm run allure:generate` first                                                                |

## 14. AI usage

This project was built with **Claude Code** (Anthropic's AI coding assistant) as a pair programmer:
exploring the site (Playwright MCP), writing tests, page objects and the CI pipeline, analysing
failure traces, and drafting docs.

How the output was checked:

- Every change was linted, type-checked and run before it was committed; CI runs on every push.
- API response shapes and URLs were checked against the real services before any schema was written.
- Flaky failures were investigated in traces (actions, network calls, screenshots) before deciding
  on a fix; tests that couldn't be made stable were removed, not retried.

## 15. What I'd add next

- Stable cart tests for quantity and remove: set up the cart through the API (bound to the browser's
  cart token) and wait until the cart page has finished loading before interacting.
- More browsers (Firefox, WebKit) and a mobile viewport, once they're stable on the QA site.
- Allure environment info (URLs, browser, Node, User-Agent) in the report.
- Contract tests for the cart API.
- A nightly summary posted to a team channel (Slack or a GitHub issue).
