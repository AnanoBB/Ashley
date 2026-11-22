# API overview: Awara products (QA environment)

> Checked on 2026-11-21. Response shapes come from real responses saved in a browser. Status codes
> are the ones actually seen with curl and the browser. Anything marked **not observed** is unknown,
> not guaranteed.

## Base URL

| Env | URL                                   | Override               |
| --- | ------------------------------------- | ---------------------- |
| QA  | `https://api.qa-env.residenthome.com` | `API_URL` env variable |

## Auth method

- **No authentication.** No API key, token or cookie is needed. A plain browser `GET` returns JSON.
- **Required header:** `User-Agent: E2EUI-Tests-Brands-CI` (since
  2026-11-22), set globally in `playwright.config.ts` from `src/config/env.ts`. The assignment's
  `E2EUI-Tests` is still blocked.
- **Cloudflare WAF in front of the API.** Non-browser clients (curl, Playwright's request context)
  get a **403 HTML block page**, whatever the User-Agent is (tested with `E2EUI-Tests`, no UA, and a
  Chrome UA). A browser on the same network gets through. Getting the tests through needs a WAF rule
  on the owner's side; it lets through UA `E2EUI-Tests-Brands-CI` (200 JSON on both endpoints).

## Endpoints

### 1. List products by brand

`GET /products?brand={brand}`

| Query param | Type   | Required | Example |
| ----------- | ------ | -------- | ------- |
| `brand`     | string | yes\*    | `awara` |

Example: `GET /products?brand=awara` returned **91** products, all with `brand: "awara"`.

### 2. Get a product by name

`GET /products?name={name}&lang={lang}&brand={brand}`

| Query param | Type   | Required | Example                        |
| ----------- | ------ | -------- | ------------------------------ |
| `name`      | string | yes\*    | `the-awara-hybrid-mattress-30` |
| `lang`      | string | no\*     | `en`                           |
| `brand`     | string | yes\*    | `awara`                        |

Example: it returned exactly **1** product (`id 64e7b25e420000075e9aba89`, title "Awara Classic
Hybrid Mattress").

\* "Required" reflects how the assignment uses the endpoint. Behavior without these params was not
observed.

Both endpoints are the same resource (`/products`) with different filters, so they share one
response shape.

## Status codes

| Code              | When                                                         | Body                                                 | Observed                                  |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------- |
| **200**           | Request reaches the API (browser)                            | JSON, see below                                      | yes (both endpoints)                      |
| **403**           | Cloudflare WAF blocks a non-browser client (curl/Playwright) | `text/html` "Attention Required! \| Cloudflare" page | yes (both endpoints, with and without UA) |
| 200, empty `data` | Filter matches nothing (e.g. unknown `name`)                 | expected `result.data: []`                           | **not observed**                          |
| 4xx/5xx           | Invalid params / server errors                               | unknown                                              | **not observed**                          |

## Response shape (200)

```jsonc
{
  "status": "ok", // a string, NOT an object
  "result": {
    "total_count": 91, // equals result.data.length in both samples
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

- Schema: `src/api/schemas/products.schema.ts` (zod; required keys typed strictly, optional keys `.optional()`, `.passthrough()`)
- Client: `src/api/ProductsApi.ts`, `getProducts({ brand, name, lang })`
- Tests: `tests/api/products.spec.ts`
