# Workflow — switch to production

Run this **only** when the user has explicitly told you to switch to production ("cambia a prod",
"pásalo a producción", "switch to prod"). Never start it yourself.

Backend and front end are already built and working locally. This workflow changes **four values**
and nothing else. Do not re-run a build workflow, re-copy templates, or edit any other line.

## Ask (only this, in the user's language, then wait for the answer)

> ¿Cuál es la URL donde va a vivir el embed?
> (ej. `https://probability-acme-summer-giveaway.onprobability.com`)

Ask nothing else. Do not guess the URL from the repo name, `domains.config.json` or anywhere
else; use only what the user answers.

This is the Express server on Coolify that serves `/embed/embed.iife.js` and `/api/address/*`.
It is **not** the client's website where the form gets pasted.

From the answer derive:

|            | Rule                                        | Example                                                      |
| ---------- | ------------------------------------------- | ------------------------------------------------------------ |
| **origin** | `https://` + host, no path, no trailing `/` | `https://probability-acme-summer-giveaway.onprobability.com` |
| **host**   | origin without `https://`                   | `probability-acme-summer-giveaway.onprobability.com`         |

If the user gives a path (`https://domain/test/test`, `…/embed/embed.iife.js`), drop it: the
endpoints always hang off the server root (`{origin}/api/address/autocomplete`).

## Change (exactly these four things)

1. **Backend** — `server/services/smarty-streets.ts`, the line starting `const DEFAULT_WEBSITE_HOST =`:
   ```ts
   const DEFAULT_WEBSITE_HOST = "<host>";
   ```
2. **Backend** — `.env.example`, the comment above `SMARTY_WEBSITE_HOST=`:
   ```
   # Optional — defaults to <host>.
   ```
3. **Front end, fixed endpoint URL** — create `.env.production` at the project root (or set the
   line if the file exists):
   ```
   VITE_API_ORIGIN=<origin>
   ```
   `embedOrigin()` reads it first, so the production bundle always calls this server and never the
   host page's domain. `pnpm dev` ignores `.env.production`, so local work keeps using localhost.
   Make sure `.env.production` is **not** in `.gitignore`: Coolify builds from the repo and needs it.
4. **Front end, environment** — in `src/components/<prefix>/<prefix>.ts`, the `env` property:
   ```ts
   env = "prod";
   ```
   Entries now go to `submission/prod/{id}` and settings are read with `{ env: "prod" }`.

Find each with `grep -n` and edit only that line.

## Verify

1. `pnpm typecheck` and `pnpm build` pass.
2. `git diff` shows only those changes (plus the new `.env.production`).
3. The built bundle carries the fixed origin:
   ```bash
   grep -c "<host>" dist/embed/embed.iife.js   # ≥ 1
   ```
4. Once deployed:
   ```bash
   curl -s "<origin>/api/address/autocomplete?q=123+main&country=USA"   # 200, success:true, suggestions[]
   curl -sI "<origin>/api/address/autocomplete?q=123+main&country=USA"  # Access-Control-Allow-Origin: *, Cache-Control: no-store
   ```
   If it isn't deployed yet, say this check is pending.

## Report to the user

- The origin that was set and the `git diff`.
- That entries now go to the campaign's **prod** environment.
- What they must do in the Coolify environment panel, values **without quotes**:
  - Secret pair (recommended): `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN`. The host is not used.
  - Website key: `SMARTY_WEBSITE_KEY`, **and** authorize that exact host in Smarty's dashboard
    (Website Keys → hosts). If the host doesn't match, every lookup answers 500.
- The snippet the client pastes:
  ```html
  <script src="<origin>/embed/embed.iife.js"></script>
  <<prefix>></<prefix>>
  ```
