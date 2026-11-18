# Workflow — handoff (deploy request and installation snippet)

Run this **only** when the user says local testing is finished and everything works
("todo funciona perfecto", "ya terminé todas las pruebas en local y funciona todo bien", or
equivalent). Never start it yourself. Don't change any code in this workflow.

Two parts. Part 2 starts only when the user pastes the published URL.

---

## Part 1 — Report and branch for Jose's bot

### 1. Branch

1. `git status` and `git branch --show-current`.
2. On the default branch (`main`/`master`) → the work must go on its own branch. Uncommitted
   changes or a branch not pushed yet → ask once, then wait:
   > Para pasarle la rama al bot necesito que esté subida. ¿Hago commit y push de los cambios en
   > la rama `<branch>`?
   > Commit / push only after a yes. Never include `.env` (it must stay gitignored).
3. Note the branch name and the repo remote (`git remote get-url origin`).

### 2. Report

Build it from what this session (or the code) shows, short, no secrets:

- Project: the promotion name and the component tag.
- What's included: Smarty address autocomplete (yes/no), mode (Universal Form campaign / Probability
  program), receipt upload (PDF/HEIC), captcha, GA (ID), thank-you copy source (brief/default).
- Local tests: each check from the build workflows and its result.
- Pending: anything still open (legal links "To Follow", entry-limit rule, etc.).
- Server needs: Node 22, `pnpm build` then `pnpm serve` (the repo's `nixpacks.toml`), environment
  variables `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` without quotes. **Never write their values
  in the report or the message**; say they are shared separately.

### 3. Message to paste

Give the user this block, ready to copy (fill every `<…>`):

```
@Jose's Server Garage por favor publica este embed.

Repo: <remote url>
Rama: <branch>

Reporte:
- Proyecto: <promotion name> — componente <tag>
- Incluye: <modules>
- Pruebas en local: <results>
- Pendiente: <pending items, or "nada">
- Servidor: Node 22, pnpm build + pnpm serve (nixpacks.toml). Variables de entorno:
  SMARTY_AUTH_ID y SMARTY_AUTH_TOKEN (sin comillas; te las paso por separado).

Cuando esté publicado, respóndeme con la URL donde va a vivir el embed.
```

Then tell the user, and stop:

> Pégale esto al bot de Jose. **Pásale también las credenciales de Smarty** (`SMARTY_AUTH_ID` y
> `SMARTY_AUTH_TOKEN`, las mismas de tu `.env`), sin comillas y en un mensaje aparte: sin ellas
> el autocompletado de dirección no funciona en el servidor y no se puede enviar el formulario.
> Cuando publique, pega aquí la URL donde va a vivir el embed.

Never read, print or paste the credential values yourself; the user sends them to the bot.

---

## Part 2 — Installation snippet (after the user pastes the published URL)

1. Normalize to the origin (`https://host`, no path, no trailing `/`), as in
   `go-to-production.md`.
2. Check it is live:
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "<origin>/embed/embed.iife.js"   # 200, javascript
   ```
   Not 200 → tell the user the embed isn't reachable at that URL yet and ask them to check with
   Jose's bot. Don't hand out the snippet.
3. Give the snippet (the component tag from `src/embed.ts` / the component file):
   ```html
   <script src="<origin>/embed/embed.iife.js"></script>
   <<tag>></<tag>>
   ```
   With the line: _"Pega esto en el documento que te pasará Maria Camila Leal para la instalación
   del componente."_
4. If the component still has `env = "test"`, add one line stating it as a fact: _"Ojo: el
   componente sigue en test (los registros van al entorno de prueba)."_ Don't switch it, don't
   ask for anything: switching is only `go-to-production.md`, on the user's explicit "cambia a prod".
