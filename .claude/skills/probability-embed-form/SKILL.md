---
name: probability-embed-form
description: Build Probability sweepstakes/promotion entry forms as embeddable web components (Lit, light DOM, Vite library build, Express demo CDN) wrapping Universal Form, following the reference project probability-valvoline-oil-change-us-sweepstakes. Adds the Smarty address-autocomplete backend and the entry-form front end (campaign fields, receipt upload with PDF/HEIC, EI captcha, GA4, Figma design) to a project already on the embed boilerplate, and later switches it to production. Use whenever someone asks to create, scaffold or extend a Probability embed form or sweepstakes entry-form embed, or says "cambia a prod" on one, even if they only mention a brand and a promotion name.
---

# Probability embed form

One skill, built module by module. Templates are copied **verbatim** from `templates/`: do not
redesign, rename or "improve" them — copy, replace placeholders, fill the marked values, verify.

Reference project (the source of every template): `probability-valvoline-oil-change-us-sweepstakes`.

## Target project

The project you work in is already built on the same embed boilerplate as the reference project:
Lit light-DOM components, `src/embed.ts`, Vite library build into `dist/embed/`, the
`@embed-entry` HTML rewrite, Express + helmet in `server/index.ts`, `domains.config.json`,
`tsconfig.node.json`, oxlint/oxfmt, pnpm, Node 22, Coolify/nixpacks. **Do not create, restructure
or "fix" any of that.** This skill only adds what the boilerplate lacks:

1. The Smarty address-autocomplete **backend**.
2. The entry-form **front end** (the component wrapping Universal Form).

The preconditions listed in each workflow are a sanity check: they should always pass. If one
fails, stop and tell the user instead of building the missing base yourself.

## Start here — detect the state, then read ONLY the matching workflow

Do not read the other workflow files. Do not redo or modify anything already built.
"Form component exists" = some file in `src/components/` contains `universal-form`.

| Situation                                                                                                                                                               | How to tell                                                                                                 | Read only                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Nothing built yet                                                                                                                                                       | `server/services/smarty-streets.ts` does not exist                                                          | `workflows/smarty-backend-build.md` (it continues into the front end)     |
| Backend built, credentials not working yet                                                                                                                              | `server/services/smarty-streets.ts` exists and `node <skill-dir>/scripts/check-smarty-env.mjs .env` exits 1 | `workflows/smarty-backend-build.md` — resume at **Phase C** only          |
| Backend done, form not built yet                                                                                                                                        | credentials check exits 0 and no form component exists                                                      | `workflows/frontend-build.md`                                             |
| Everything built, and the user **explicitly** tells you to switch to production ("cambia a prod", "pásalo a producción", "switch to prod")                              | form component exists **and** that instruction is in the user's message                                     | `workflows/go-to-production.md`                                           |
| Everything built, and the user says local testing is done and everything works ("todo funciona perfecto", "ya terminé todas las pruebas en local y funciona todo bien") | form component exists **and** that statement is in the user's message                                       | `workflows/handoff.md` — Part 1                                           |
| Handoff message already given, and the user pastes the URL Jose's bot published                                                                                         | the previous turn ended with the handoff message **and** the user's message is that URL                     | `workflows/handoff.md` — Part 2                                           |
| Everything built, anything else                                                                                                                                         | form component exists                                                                                       | Nothing here — do only what the user asked, without touching what's built |

**Production is never your initiative.** Do not ask for the production URL, suggest switching,
change `DEFAULT_WEBSITE_HOST`, write `.env.production` or set `env = "prod"` on your own — not at
the end of a build, after a deploy, or because you see a domain somewhere. Only the user's
explicit "switch to production" instruction starts `workflows/go-to-production.md`.

## References (read only when a workflow points to them, or to debug)

- `references/smarty-backend.md` — how the Smarty proxy works.
- `references/frontend.md` — the component's pieces, program vs config mode, field mapping,
  receipt, submission, analytics events.
- `references/universal-form-prompt.md` — the Universal Form integration prompt (step 1 of the
  front end).
- `references/ei-captcha.md` — the EI captcha.

## Modules

| Module                                                                                   | Status | Workflows                           |
| ---------------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| Smarty address autocomplete — backend                                                    | ready  | `workflows/smarty-backend-build.md` |
| Entry-form front end (Universal Form, Smarty dropdown, receipt, EI captcha, GA4, design) | ready  | `workflows/frontend-build.md`       |
| Handoff: deploy request to Jose's bot + installation snippet                             | ready  | `workflows/handoff.md`              |
| Switch to production                                                                     | ready  | `workflows/go-to-production.md`     |
