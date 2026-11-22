# API overview: Awara products (QA environment)

> First checked on 2026-11-21 in a browser; status codes, errors and filter behaviour re-checked with
> the test User-Agent on 2026-11-22. Every behaviour below is asserted by a test in `tests/api/`.

## Base URL

| Env | URL                                   | Override               |
| --- | ------------------------------------- | ---------------------- |
| QA  | `https://api.qa-env.residenthome.com` | `API_URL` env variable |

## Access

- **No authentication.** No API key, token or cookie is needed.
- **User-Agent:** a Cloudflare WAF sits in front of the API and lets through
  `User-Agent: E2EUI-Tests-Brands-CI` (provided for these tests on 2026-11-22). It is set once in
  `src/config/env.ts` and used by `playwright.config.ts`. The assignment's `E2EUI-Tests` still
  gets a **403 HTML block page** (so did no User-Agent and a Chrome User-Agent on 2026-11-21).

## Endpoint: `GET /products`

One resource, filtered by query parameters. Both assignment calls use it and share one response
shape.

| Query param | Required | Behaviour (observed)                                                                      |
| ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `brand`     | **yes**  | Must be a known brand; case-insensitive (`AWARA` = `awara`). Missing → 400, unknown → 400 |
| `name`      | no       | Exact, case-sensitive product slug. No match → 200 with an empty list                     |
| `lang`      | no       | Has no effect: `es`, `fr` and invalid values return the same body as `en`                 |

Examples:

- `GET /products?brand=awara` → 200, **91** products, all with `brand: "awara"`.
- `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` → 200, exactly **1**
  product (`id 64e7b25e420000075e9aba89`, "Awara Classic Hybrid Mattress").

## Status codes

| Code    | When                                                 | Body                                                                                        | Test               |
| ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| **200** | Valid query, including one that matches nothing      | JSON, see below (`data: []`, `total_count: 0` when nothing matches)                         | API-01, 02, 04     |
| **400** | `brand` missing (even with `name`), empty or unknown | `{ "status": "error", "error": "missed brand values" }` or `"No such brand name '<brand>'"` | API-03, 05, 09, 10 |
| **403** | User-Agent not allowed by Cloudflare                 | `text/html` "Attention Required! \| Cloudflare" page                                        | (README §12)       |
| **405** | `POST`, `PUT`, `DELETE`                              | `text/plain` "POST not allowed. Defined methods: GET"                                       | not tested         |

Unusual `name` values (SQL-like characters, 3000 characters, empty) return 200 with an empty list,
never a 5xx (API-11).

## Limits

- **Lists are capped at 200 items**, while `total_count` reports the full number (brand `nectar`:
  `total_count` 1025, 200 returned). There is no paging parameter we know of. Tests that compare
  lists (API-07a, API-08) first check the list is complete (`data.length === total_count`).

## Response shape (200)

```jsonc
{
  "status": "ok", // a string, NOT an object
  "result": {
    "total_count": 91, // can be higher than data.length: lists are capped at 200
    "count_by_category": {
      "category": { "Mattress": 11, "Accessories": 28 /* ... */ },
      "group": { "Mattress": 14, "Bundle": 10 /* ... */ },
      "construction": {},
      "prices": {},
      "style": {},
      "rooms": {},
      "colors": {},
      "material": {},
      "sizes": {},
    },
    "data": [/* Product[] */],
  },
}
```

> **Path to data:** the assignment writes `status.result.data`, but the real path is
> **`result.data`**. `status` is a string next to `result`.

### Product

Keys on **every** item (91/91):

| Key                | Type                  | Notes / example                                                              |
| ------------------ | --------------------- | ---------------------------------------------------------------------------- |
| `id`               | string                | `64e7b25e420000075e9aba89`                                                   |
| `name`             | string                | slug: `the-awara-hybrid-mattress-30`                                         |
| `title`            | string                | `Awara Classic Hybrid Mattress`                                              |
| `type`             | string                | `product`                                                                    |
| `isService`        | string                | `"false"` (a string, not a boolean)                                          |
| `brand`            | string                | `awara`                                                                      |
| `description`      | string                | may be empty                                                                 |
| `inventoryKey`     | string                | `slimbadjustable`                                                            |
| `extras`           | string[]              | IDs of related products                                                      |
| `addons`           | `{ id, addonType }[]` |                                                                              |
| `categoryNameTree` | string[]              | `["Mattress", ...]`                                                          |
| `mediaCollection`  | object[]              | `{ id, title, url, thumbUrl, contentType, tags, created }`                   |
| `pricing`          | object                | see below                                                                    |
| `availability`     | object keyed by SKU   | `{ "<sku>": { isActive, isInStock, isBackOrderAllowed, backOrderMessage } }` |

Keys on **some** items only:

| Key                    | Present | Type / shape                                                                                 |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `status`               | 85/91   | string, e.g. `active`                                                                        |
| `configuration`        | 85/91   | `{ operations, sharetownSupported, trialPeriod }`                                            |
| `attributes`           | 80/91   | `{ category, categoryNameTree, group, markers }`                                             |
| `metadata`             | 79/91   | `{ url, seo_title, seo_desc, trialPeriod, donatable }`                                       |
| `properties`           | 76/91   | `{ name, title, options }[]` (e.g. sizes)                                                    |
| `categoryId`           | 67/91   | string                                                                                       |
| `skuData`              | 63/91   | `{ sku, status, price: { bookPrice, totalValue }, totalValue, configuration, properties }[]` |
| `translations`         | 30/91   | array (empty for the hybrid mattress)                                                        |
| `measures`             | 28/91   | not inspected                                                                                |
| `warrantyData`         | 12/91   | not inspected                                                                                |
| `packageConfiguration` | 2/91    | not inspected                                                                                |

### Pricing

```jsonc
"pricing": {
  "price":     { "amount": 59900, "currency": "$" }, // amounts are in cents
  "listPrice": { "amount": 59900, "currency": "$" },
  "label": "$599",
  "description": "One payment of $599. "
}
```

## Where this is used in the repo

- Schemas: `src/api/schemas/products.schema.ts` and `error.schema.ts` (zod; required keys typed
  strictly, optional keys `.optional()`, `.passthrough()` for keys we don't check)
- Client: `src/api/ProductsApi.ts` (`getProducts`)
- Shared checks: `tests/api/support.ts` (`expectProducts`, `expectApiError`)
- Tests: `tests/api/products.spec.ts`, `products-filters.spec.ts`, `products-negative.spec.ts`
