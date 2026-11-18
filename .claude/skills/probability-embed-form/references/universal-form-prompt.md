# Universal Form — integration prompt (verbatim from the user)

Run this prompt's question flow when the front-end workflow reaches the Universal Form step.
Docs: https://universal-form.onprobability.com/

How it maps onto an embed (read `workflows/frontend-build.md` for the full flow):

- "Load it only from this URL": the component injects that URL itself (`injectScript(..., "module")`),
  because consumer pages only paste our bundle. Never install or copy Universal Form.
- "Then build it" / "which page": the form is built **inside the embed component**, and the demo
  pages are `index.html` and `example/index.html`. Don't ask which page.
- `env="test"` while building; it becomes `env="prod"` only through `workflows/go-to-production.md`.
- The prompt's campaign ID is a **Universal Form** campaign: with it Universal Form builds
  everything by itself and get-form-fields is not used. When the user has none, the **Probability
  program ID** is asked and the fields are read from get-form-fields (the prompt's "ask the
  fields" applies only when there is no Probability program ID either); which feeds
  get-form-fields (dates, captcha) and the submission. GA always has its own ID, asked separately
  (see `workflows/frontend-build.md`, step 1).

---

You are adding Probability's Universal Form to a web page. Your job is not to
show a snippet: it is to build the form into their page.

**Load it only from this URL**, in a `<script type="module">`:
`https://universal-form.onprobability.com/v1/dist/index.js`. It is not on npm:
never run `npm install` / `pnpm add` / `yarn add` for it, never write
`import '@uf/universal-form'`, and never download or copy the bundle into the
project. That holds for any stack (React, Vue, Lit, a bundler…): the script
goes in the page's HTML and the element is then used like any other tag.

First ask: "Do you have a Probability campaign ID?"

**If yes**, ask for the ID and whether this is the live page. Then ask: "Should
the form store each entry in Probability, or just hand the data to your page?" —
and say why you ask, because it is what decides the `send` attribute:

- With `send`, the form stores every entry in the campaign by itself and then
  shows the campaign's thank-you. Nothing else is needed on the page.
- Without `send`, the form stores nothing: it gives the data in a `uf-submit`
  event, and the page decides where it goes (its own backend, a CRM…).

The form is these two lines:

```html
<script type="module" src="https://universal-form.onprobability.com/v1/dist/index.js"></script>
<universal-form program="CAMPAIGN_ID" env="test" send></universal-form>
```

Keep `send` only if they want the entries stored in Probability. **Always write
`env`**, so they can see which environment they are working in: `env="test"`
while the page is being built, `env="prod"` on the live page. Don't ask about
fields, and don't write any URL or config: the form loads everything from the
campaign.

**If no**, ask what fields they need (label, type, required, and options for
lists) and confirm the list with them. Then write the config with **every field
they confirmed** — this only shows its shape:

```html
<script type="module" src="https://universal-form.onprobability.com/v1/dist/index.js"></script>
<universal-form
  config='{"fields":[
  {"type":"text","name":"first_name","label":"First name","required":true}
]}'
></universal-form>
```

Without a campaign there is nowhere to store the entries, so don't ask about
`send`: add a `uf-submit` listener to the page that receives the data
(`e.detail.values`), and tell them it is where their page sends it on.

Field types: text, email, tel, number, zipcode, date, textarea, select, radio,
checkbox, checkbox-group, signature. Names in snake_case.

**Conditional fields.** When a field should only show after some answer, add a
`condition` to **the field that shows**, and put it right after the field it
depends on:

```json
{
  "type": "text",
  "name": "company",
  "label": "Company name",
  "required": true,
  "condition": { "field": "account_type", "value": "business" }
}
```

`field` is the `name` of the field that decides. That is the whole job: don't
write JavaScript, listeners, CSS or `hidden` for it. The form shows and hides
the field itself; while hidden it is not validated (`required` means "required
when it shows") and not sent. What to compare, by the deciding field's type:

- select, radio: the option's `value`, never its label. `"operator":"neq"`
  to hide on an answer, `"operator":"includes"` with an array for several.
- checkbox: `"value":"true"` (ticked). It is a string, not a boolean.
- checkbox-group, select with `multiSelect`: `"operator":"contains"` and one
  option's value.
- number: `"operator"` `gt`, `gte`, `lt` or `lte`, with a number.
- text, email, tel, zipcode, date: `"operator":"matches"` with a regular
  expression (`\\` in JSON; dates are `YYYY-MM-DD`).
- image, document, video, signature: `"operator":"neq"`, `"value":""` means
  "something was added".

One condition per field: no AND/OR, and never make a field depend on another
conditional field — make it depend on the original one. A condition only shows
or hides; if they ask for something else (options that change, a value that
changes, comparing two dates), say the form does not do it rather than
building it by hand. With a campaign ID the conditions come from the campaign:
don't add any.

**Then build it.** Ask which page the form goes on if it is not clear.

- If you can edit their files: put the `<script>` once in that page's `<head>`
  and the `<universal-form>` where the form should appear. If there is no page
  yet, create one.
- If you cannot: give the whole page, a complete HTML file ready to save and
  open, not just the two lines.

End by saying how to open it and what they should see.
