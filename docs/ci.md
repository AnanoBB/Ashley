# CI: automatic, nightly and manual runs

The pipeline lives in `.github/workflows/ci.yml`.

## When it runs

| Trigger                       | What runs                                    | Publishes the report |
| ----------------------------- | -------------------------------------------- | -------------------- |
| Push to any branch (not tags) | All tests                                    | Only on `main`       |
| **Nightly**, 03:00 UTC        | **Full regression**: all 35 tests, on `main` | Yes                  |
| **Manual** ("Run workflow")   | All tests, or the project/filter you choose  | No                   |
| Pull request from a fork      | All tests                                    | No                   |

## Running it manually (no commit needed)

Runs code that is already on GitHub, on any branch.

- **On GitHub:** **Actions** → **CI** → **Run workflow** → pick the branch, `project` (`all` / `api`
  / `ui`), an optional `grep` filter (`@smoke`, `@negative`, `UI-13`, …) and `quarantined` to run
  the `@quarantine` tests instead of skipping them.
- **From a terminal** (GitHub CLI): `gh workflow run ci.yml --ref main -f project=ui -f grep=@smoke`
- **Quarantined tests only:** `gh workflow run ci.yml --ref main -f project=ui -f grep=@quarantine -f quarantined=true`

Uncommitted local changes can't run on GitHub; run them locally with `npm test`.

## What happens in a run

```
lint ──► test (api) ──┐
     └─► test (ui) ───┴─► report ──► publish-report
```

| Job                   | What it does                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint`                | ESLint (no warnings allowed), Prettier and TypeScript checks, the Docker image tag check and the report-script tests. Tests only start if this passes.                                              |
| `test (api)` / `(ui)` | One job per project, in parallel, both in the Playwright Docker image ([Running in Docker](development.md#running-in-docker)). Both always finish.                                                  |
| `report`              | Merges both projects' results into one Allure report, adds the history, and writes pass / fail / flaky / known bug counts and the quarantined tests with their reasons to the run's **Summary** tab |
| `publish-report`      | Puts the report on [GitHub Pages](https://ananobb.github.io/Ashley/), even when tests fail (push to `main` and nightly only)                                                                        |

## Artifacts

Download from the run page → **Artifacts** (kept 14 days), or `gh run download <run-id> -n <name>`.

| Artifact                                         | Contents                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `allure-report`                                  | The merged Allure report                                                |
| `allure-results-api` / `allure-results-ui`       | Raw Allure results per project                                          |
| `playwright-report-api` / `playwright-report-ui` | Playwright HTML report per project                                      |
| `test-results-api` / `test-results-ui`           | Traces, videos and screenshots of failures (only when something failed) |

## Other rules

- **Retries:** 1 in CI, 0 locally. A test that passes only on the retry is counted as **flaky** in
  the summary, so it stays visible; locally, a flaky test fails in front of its author.
- **Known bugs:** a `@known-bug` test that fails for another reason than its bug (its message lacks
  the `expectedError` from `knownBug()`) fails the test job (`mark-known-bugs.mjs --strict`).
- **Cancelling:** a newer push to the same branch cancels the older run. On `main`, pushes and the
  nightly run share one queue so they don't overwrite each other's report history: a push cancels
  a run in progress, a nightly waits for it. Manual runs are never cancelled.
- **Allure history:** push-to-`main` and nightly runs download the previous `history.jsonl` from the
  published report and publish the updated one, so the report shows trends over time.
- **Notifications:** GitHub emails you when a run you started fails, and the nightly failure goes to
  whoever last changed its schedule. Settings: https://github.com/settings/notifications → Actions.
