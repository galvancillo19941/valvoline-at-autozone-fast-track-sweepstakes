# Smarty backend — reference

Reference implementation: `probability-valvoline-oil-change-us-sweepstakes`
(`server/services/smarty-streets.ts`, `server/controllers/address.ts`, `server/index.ts`, `vite.config.ts`).
The files in `templates/smarty-backend/` are copied from it verbatim; the only change is the
`{{SERVER_HOST}}` placeholder.

## Why it is a server-side proxy

```
browser → GET {embed host}/api/address/autocomplete → our Express → Smarty → normalized JSON
```

- Smarty's secret pair (auth-id + auth-token) must never ship in the browser bundle.
- A browser "website key" would have to be authorized in Smarty's dashboard for **every consumer
  domain** the embed is pasted into. Going through our server, Smarty only ever sees our host.
- The same Express app that serves `/embed/embed.iife.js` serves `/api/address/*`, so the front
  end resolves the API against the bundle's own origin (no hardcoded host).

## Files and responsibilities

| File                                | Role                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `server/services/smarty-streets.ts` | SDK wiring: credentials, the two clients, lookups, normalization                  |
| `server/controllers/address.ts`     | HTTP handlers: input validation, response shape, safe errors                      |
| `server/index.ts`                   | Production mount (Express) with CORS `*` + `Cache-Control: no-store`              |
| `vite.config.ts`                    | Dev mount (`embedApiDevServer()` plugin), because `pnpm dev` does not run Express |
| `.env.example`                      | Documents the Smarty variables                                                    |

`tsconfig.node.json` must include `server/**/*.ts` and `vite.config.ts` (it does in the
boilerplate), with `moduleResolution: "bundler"` — imports use the `.js` extension
(`./controllers/address.js`) and `tsx` resolves them to the `.ts` file.

## Service (`smarty-streets.ts`)

### Credentials — resolution order

1. `SMARTY_AUTH_ID` + `SMARTY_AUTH_TOKEN` → `StaticCredentials`. Preferred: not host-restricted.
2. `SMARTY_WEBSITE_KEY` (+ `SMARTY_WEBSITE_HOST`, default `DEFAULT_WEBSITE_HOST`) →
   `SharedCredentials`, signed with that host as Referer. Smarty must authorize **our server's
   host** only.
3. Neither → throws → the controller answers 500.

### Clients

Built lazily once, reused (a `ClientBuilder` holds no per-request state):

- **USA** → US Autocomplete Pro, license `us-autocomplete-pro-cloud`.
  Returns `street`, `secondary`, `city`, `state`, `zipcode` split out.
- **Any other supported country** → International Autocomplete, license
  `international-autocomplete-v2-cloud`. Returns `addressText` + `addressId`; `getAddressDetails`
  expands an `addressId` into components.

`SUPPORTED_COUNTRIES` is a set of ISO-3 codes (USA, CAN, GBR, AUS, NZL and most of Europe).
MEX is **not** in it even though the controller's 400 hint mentions it.

### `unifiedAutocomplete()`

Single entry point for the controller. Routes by country and always returns
`{ suggestions, topResult }`. For International it also fetches details of the first suggestion
as `topResult` (one extra billed lookup).

## Controller (`address.ts`)

Constants: `MIN_SEARCH_LENGTH = 3`, `DEFAULT_MAX_RESULTS = 5`, `MAX_RESULTS_LIMIT = 10`.
Smarty bills per lookup, so short queries are refused and result counts are capped.

`fail()` logs the real error server-side and answers a **generic** message. Never return the
SDK's error text: it can echo the request URL, auth-id included.

### Routes

| Route                               | Used by the form?                   | Params                                                                                                                                                     | 200 body                                                                |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/address/autocomplete`     | **Yes** (every debounced keystroke) | `q`_, `country`_, `maxResults`, USA-only: `selected`, `includeOnlyCities` (`"Chicago,IL;Seattle,WA"`), `preferStates` (`"IL,WI"`), `preferRatio`, `source` | `{ success, query, country, totalSuggestions, suggestions, topResult }` |
| `GET /api/address/search`           | No                                  | `q`_, `country`_, `maxResults`                                                                                                                             | `{ success, query, country, totalResults, data }` (International only)  |
| `GET /api/address/details`          | No                                  | `addressId`_, `country`_                                                                                                                                   | `{ success, data }` or 404                                              |
| `GET /api/address/validate-country` | No                                  | `country`*                                                                                                                                                 | `{ success, country, isSupported }` (no Smarty call)                    |

Errors (all routes): 400 `{ success:false, error }` for missing/short/unsupported input
(unsupported country adds `hint`); 500 `{ success:false, error:"Failed to …" }` for any SDK or
credential failure.

### `suggestions[]` shape for USA (what the front end reads)

```json
{
  "addressText": "123 Main St",
  "street": "123 Main St",
  "secondary": "Apt 4",
  "city": "Chicago",
  "state": "IL",
  "zipcode": "60601",
  "entries": 0
}
```

`entries > 0` means the address has secondary units; re-query with `selected` to list them.

## Mounting — both places, always

- **Production** — `server/index.ts`: `process.loadEnvFile()` in a try (local `.env`; absent in
  prod), then a `/api/address` middleware setting `Access-Control-Allow-Origin: *` (called from
  third-party pages) and `Cache-Control: no-store` (never a stale list), then the four `app.get`.
  The routes go before the catch-all `express.static(distDir)`.
- **Dev** — `vite.config.ts`: `embedApiDevServer()` with `apply: "serve"`, its own
  `loadEnvFile()`, and `server.ssrLoadModule("/server/controllers/address.ts")` per request so
  edits apply without a restart. Without it, Vite answers `/api/address/*` with the demo HTML
  (status 200) and the front end shows no suggestions and no error.

A new address route must be added in **both** files.

## Environment

| Variable              | Required             | Notes                                                                                                                     |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `SMARTY_AUTH_ID`      | yes (or website key) | Smarty dashboard → Keys → Secret Keys                                                                                     |
| `SMARTY_AUTH_TOKEN`   | yes (or website key) | same                                                                                                                      |
| `SMARTY_WEBSITE_KEY`  | alternative          | Smarty dashboard → Website Keys; authorize our server host                                                                |
| `SMARTY_WEBSITE_HOST` | no                   | defaults to `DEFAULT_WEBSITE_HOST`: `localhost` while building, the production host after `workflows/go-to-production.md` |
| `PORT`                | no                   | defaults to 3000                                                                                                          |

- Local: `.env` at the project root (gitignored).
- Production (Coolify): the host's environment panel. Values **without quotes** —
  `loadEnvFile` strips quotes locally, the panel does not, and a quoted key fails auth.

## Smarty account prerequisites

- License **US Autocomplete Pro** (USA). Add **International Autocomplete** only for non-US.
- A Secret Key pair created; or a Website Key with our server host authorized.

## Known pitfalls

- Forgetting the Vite mount → works on `pnpm start`, silently empty on `pnpm dev`.
- Quoted values in the hosting panel → every lookup 500s.
- `DEFAULT_WEBSITE_HOST` left pointing at another project's domain → website-key auth fails.
  (The Valvoline reference has exactly this mismatch: its default host differs from the domain
  in its `domains.config.json`.)
- Returning `error.message` from the SDK to the client → leaks the auth-id.
