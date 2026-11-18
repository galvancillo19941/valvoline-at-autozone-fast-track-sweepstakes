# Workflow — build the Smarty backend (local)

Server-side proxy `GET /api/address/*` → Smarty, so credentials never reach the browser and no
consumer domain needs authorizing in Smarty. Read `../references/smarty-backend.md` first.

Four phases, in order. Do not skip ahead: phase C blocks until the credentials work.

| Phase | What                                                | Asks the user?            |
| ----- | --------------------------------------------------- | ------------------------- |
| A     | Build                                               | No                        |
| B     | Verify what works without credentials               | No                        |
| C     | Credentials: create `.env`, user fills it, check it | Yes — only to fill `.env` |
| D     | Continue to the front end                           | —                         |

Work starts locally and the production URL is not known yet, so the server host is `localhost`.
It changes only through `go-to-production.md`, when the user explicitly says "cambia a prod".

---

## Phase A — Build

### Preconditions (check, don't assume)

- `server/index.ts` exists with an Express `app`, `helmet`, the `/embed` static block and a final
  `app.use(express.static(distDir))`.
- `vite.config.ts` exists using `defineConfig(({ command }) => ({ ... }))`.
- `tsconfig.node.json` includes `server/**/*.ts` and `vite.config.ts`.
- Node ≥ 20.12 (`node -v`): `process.loadEnvFile()` doesn't exist before that. The reference
  project pins 22 in `.nvmrc`.

If any is missing, stop and tell the user: the project is not on the boilerplate.

### Steps

1. Install (skip what is already in package.json):
   - `pnpm add smartystreets-javascript-sdk express`
   - `pnpm add -D @types/express @types/node` (without them `pnpm typecheck` fails on the server code)
2. Copy verbatim:
   - `templates/smarty-backend/server/services/smarty-streets.ts` → `server/services/smarty-streets.ts`
   - `templates/smarty-backend/server/controllers/address.ts` → `server/controllers/address.ts`
3. In `server/services/smarty-streets.ts`, replace `{{SERVER_HOST}}` with `localhost`:
   ```ts
   const DEFAULT_WEBSITE_HOST = "localhost";
   ```
4. Apply `templates/smarty-backend/snippets/server-index.ts.snippet` to `server/index.ts`:
   block [1] import, block [2] `loadEnvFile`, block [3] middleware + routes at the stated anchor.
   Skip a block only if an identical one already exists.
5. Apply `templates/smarty-backend/snippets/vite-config.ts.snippet` to `vite.config.ts`:
   block [1] imports (merge), block [2] `embedApiDevServer()`, block [3] add it to `plugins`.
6. Copy `templates/smarty-backend/snippets/env.example` → `.env.example` (merge if it exists),
   replacing `{{SERVER_HOST}}` with `localhost`.

---

## Phase B — Verify without credentials

**Servers:** run `pnpm dev` / `pnpm start` in the background, and read the port from their
output: Vite moves to 5174+ if 5173 is taken, so substitute the real port in every `curl` below.
Stop every server you started when the workflow ends (or when you stop to wait for the user).

1. `pnpm typecheck` and `pnpm lint` pass.
2. `grep -rn "{{SERVER_HOST}}" server .env.example` returns nothing.
3. Start `pnpm dev` (port 5173) and check the validation answers:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5173/api/address/autocomplete?q=12&country=USA"        # 400
   curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5173/api/address/autocomplete?q=123+main&country=XXX"  # 400
   curl -s "http://localhost:5173/api/address/autocomplete?q=123+main&country=USA"
   # → exactly {"success":false,"error":"Failed to autocomplete address"} (no credentials yet)
   ```
   If a call returns HTML, the Vite plugin is not registered: fix phase A step 5.
   The 500 body must contain no auth-id and no SDK message.

Fix anything that fails before moving on.

---

## Phase C — Credentials

### C1. Create `.env`

- Confirm `.env` is listed in `.gitignore`. If not, add it **before** creating the file.
- If `.env` does not exist: copy `templates/smarty-backend/snippets/env.local` → `.env`.
- If it exists: append only the variable names it lacks. Never overwrite or delete existing lines.

### C2. Ask the user to fill it, then wait

Send this (in the user's language) and stop until they answer:

> El backend de Smarty ya está armado. Para continuar necesito las credenciales.
> Abre el archivo `.env` en la raíz del proyecto y completa, **sin comillas**:
>
> ```
> SMARTY_AUTH_ID=
> SMARTY_AUTH_TOKEN=
> ```
>
> Las encuentras en el dashboard de Smarty → API Keys → Secret Keys. La cuenta necesita la
> licencia **US Autocomplete Pro**. Avísame cuando las hayas puesto.

Never ask the user to paste the credentials in the chat. If they do anyway, don't repeat them back;
write them into `.env` yourself and tell them to rotate the keys in Smarty, since they're now in
the chat history.

### C3. Check they are there

Run the skill's checker (it prints states only, never values):

```bash
node <skill-dir>/scripts/check-smarty-env.mjs .env
```

- Exit 0 (`OK …`) → go to C4.
- Exit 1 → tell the user exactly what the output says is wrong (`missing`, `empty`, or
  `INCOMPLETE` with only one of the pair) and ask them to fix it. Repeat C3 when they answer.
  Do not continue.

Never `cat`, `grep` or otherwise print `.env`.

### C4. Check they work

`.env` is read only when the server starts, so **restart** `pnpm dev`, then:

```bash
curl -s "http://localhost:5173/api/address/autocomplete?q=123+main&country=USA"
```

- `"success":true` with a non-empty `suggestions` array → credentials work. Go to C5.
- `{"success":false,"error":"Failed to autocomplete address"}` → Smarty refused them. Tell the
  user (in their language):

  > Smarty rechazó las credenciales. Verifica que `SMARTY_AUTH_ID` y `SMARTY_AUTH_TOKEN` estén
  > completas y bien copiadas (sin espacios ni comillas de más), y que la cuenta tenga la licencia
  > **US Autocomplete Pro**. Avísame cuando lo revises para continuar.

  You may read the dev server's log to diagnose, but never show the user a log line that contains
  a key or the request URL. Repeat C3 → C4 when they answer. **Do not continue until this passes.**

- `"success":true` but `suggestions` is empty → try another query (`q=1600+penn`) before
  concluding anything.

### C5. Production Express

Run `pnpm start` (port 3000) and check:

```bash
curl -s  "http://localhost:3000/api/address/autocomplete?q=123+main&country=USA"   # success:true, suggestions[]
curl -sI "http://localhost:3000/api/address/autocomplete?q=123+main&country=USA"   # Access-Control-Allow-Origin: *  and  Cache-Control: no-store
```

Stop the server afterwards.

---

## Phase D — Continue to the front end

Only once C4 and C5 pass:

1. Tell the user, briefly, that the Smarty backend works locally, with the actual result of each
   check, and that the server host stays `localhost` until they say "cambia a prod".
2. Continue with `workflows/frontend-build.md`.
