# Awara QA Automation

QA automation home assignment built with **Playwright Test + TypeScript**, with **Allure** reporting
and **GitHub Actions** CI.

**Latest test report (Allure, from `main`):** https://ananobb.github.io/Ashley/

## What is tested

API base URL: `https://api.qa-env.residenthome.com`. All requests (API and browser) send the User-Agent
`E2EUI-Tests-Brands-CI`; override it with `USER_AGENT`.

| #   | Request                                                               | Assertions                                                  |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `GET /products?brand=awara`                                           | status 200, body matches schema, `result.data.length > 0`   |
| 2   | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` | status 200, body matches schema, `result.data.length === 1` |

> **About the response path:** the assignment calls it `status.result.data`. The real response is
> `{ "status": "ok", "result": { "total_count", "count_by_category", "data": [...] } }`, so `status` is
> a string next to `result`. The tests assert `status === "ok"` (in the schema) and check
> `result.data`.

> **User-Agent:** the assignment asks for `E2EUI-Tests`, but Cloudflare blocks it. The tests use
> `E2EUI-Tests-Brands-CI`, which Cloudflare lets through. See [Cloudflare and the User-Agent](#cloudflare-and-the-user-agent).

## Prerequisites

- Node.js **20+** (`node -v`)
- Java is **not** required. The Allure 3 CLI is a Node package.

## Setup

```bash
npm ci
cp .env.example .env   # optional: override API_URL / BASE_URL
```

## Running tests

| Command                             | What it does                    |
| ----------------------------------- | ------------------------------- |
| `npm test`                          | Run all tests                   |
| `npm run test:api`                  | Run the API project only        |
| `npm run test:ui`                   | Run the UI project only         |
| `npx playwright test --grep @api`   | Run tests tagged `@api`         |
| `npx playwright test --grep @ui`    | Run tests tagged `@ui`          |
| `npx playwright test --grep @smoke` | Run `@smoke` tests (API and UI) |
| `npm run test:ui -- --grep @smoke`  | Run only the UI `@smoke` tests  |
| `npm run lint`                      | ESLint + Prettier check         |
| `npm run typecheck`                 | TypeScript type check           |

Tags: `@api` and `@ui` by layer; `@smoke` and `@regression` by depth; `@cart` and `@header` by
feature.

## Reports

- **Allure:** `npm run allure:generate`, then `npm run allure:open`
- **Playwright HTML:** `npm run report:html`

Each assignment step is a `test.step()`, so the steps show up in both reports.

## CI

`.github/workflows/ci.yml` runs on every push (any branch), on pull requests from forks, and on
manual dispatch. It runs lint and the type check, then the API and UI tests (Chromium) in one run,
then generates the Allure report. The Allure report, the Playwright HTML report and the raw results are uploaded as build artifacts
(Actions run → **Artifacts**).

- A newer commit on the same branch cancels the run still in progress.
- On pushes to `main`, the Allure report is also published to GitHub Pages, even when tests fail:
  https://ananobb.github.io/Ashley/. One-time setup: **Settings → Pages → Source: GitHub Actions**.

## Project structure

```
src/
  api/            API clients (one class per resource, extending BaseApi)
  api/schemas/    zod response schemas + inferred types
  config/         env/config (API_URL, BASE_URL, User-Agent)
  fixtures/       custom Playwright fixtures — specs import test/expect from here
tests/
  api/            API specs
```

## Cloudflare and the User-Agent

Cloudflare in front of `api.qa-env.residenthome.com` answers non-browser clients (curl, Playwright's
request context) with **403 (HTML block page)**, over http and https. With the assignment's
User-Agent `E2EUI-Tests` both API tests failed on the status-200 check, so they were quarantined.

On 2026-11-22 the tests switched to the User-Agent **`E2EUI-Tests-Brands-CI`**, which Cloudflare
lets through. With it both
endpoints return 200 JSON, and both API tests pass with their assertions unchanged. It is now the
default User-Agent for all tests (`src/config/env.ts`), and the quarantine is lifted.
