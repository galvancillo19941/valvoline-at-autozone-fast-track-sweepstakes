# Front end — reference

Source: the Valvoline component (`templates/frontend/reference/component.ts.reference` and
`component.scss.reference`, copied verbatim). The generic version the agent fills in is
`templates/frontend/component/component.ts.template` + `component.scss.template`.

## Pieces

| Piece                                   | File                                                                          | Copy                                      |
| --------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| Component                               | `component/component.ts.template` → `src/components/<prefix>/<prefix>.ts`     | template, FILL values                     |
| Styles                                  | `component/component.scss.template` → `src/components/<prefix>/<prefix>.scss` | template, FILL tokens                     |
| Smarty dropdown                         | `lib/address-autocomplete.ts`                                                 | verbatim, `{{PREFIX}}` replaced           |
| API origin (dynamic, fixed in prod)     | `lib/embed-origin.ts`                                                         | verbatim                                  |
| HEIC → JPEG, PDF detection              | `lib/heic-to-jpeg.ts`                                                         | verbatim                                  |
| blob: image fallback (host CSP)         | `lib/blob-image-fallback.ts`                                                  | verbatim                                  |
| GA4                                     | `lib/analytics.ts`                                                            | verbatim                                  |
| head injection helpers                  | `lib/inject-script.ts`, `lib/inject-styles.ts`                                | verbatim                                  |
| PDF artwork (default for every project) | `assets/pdf-preview.png`                                                      | verbatim, next to the component           |
| Upload icon (optional)                  | `assets/folder-arrow-up.svg`                                                  | only if the design has no icon of its own |

`heic2any` must be a dependency (`pnpm add heic2any`) when the receipt module is used.

## Universal Form: program mode vs config mode (verified 2026-11-17)

Two kinds of ID, two modes:

| User has                                                  | Mode      | Who provides fields / dates / GA / storage                                                                                                                                                                     | get-form-fields |
| --------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| A **Universal Form campaign ID**                          | `program` | Universal Form, from its own backend                                                                                                                                                                           | not used        |
| No Universal Form ID → gives a **Probability program ID** | `config`  | fields: get-form-fields `fields` (shown to the user to confirm); dates and captcha: get-form-fields; GA: its own ID, asked; storage: the component's submit to `api.helloprobability.io/submission/{env}/{id}` | used            |

Verified 2026-11-17: `<universal-form program="ID">` fetches from Universal Form's own backend
(`api-v3-dev.onprobability.com`, regardless of `env`). A Probability program ID (one that lives on
`api.helloprobability.io`, like Valvoline's) answers **400** there and no fields render.
(A console error `Cannot read properties of undefined (reading 'length')` is a different problem:
`.skeleton` was `undefined` — always pass an array, `[]` at least.) If that happens in program
mode, the user gave a Probability program ID → switch to config mode. The reference project is
config mode.

### Using get-form-fields `data.fields[]` in config mode

The fields are built from this response, never asked (only shown to the user to confirm).
Keep `active: true` only, sorted by `order`; never rename a `name` (the submission only accepts
the campaign's names).

| Campaign                                              | Universal Form                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `name`                                                | `name`                                                                                     |
| `label` (may be HTML like `<p>…</p>`)                 | `label` = plain text; if it contains links/markup also `labelHtml` (only a/strong/em/br/p) |
| `field_required`                                      | `required`                                                                                 |
| `error`                                               | `errorMessage`                                                                             |
| `placeholder` (often empty)                           | `placeholder` = the plain label (floating-label CSS needs it)                              |
| `field_type: text`                                    | `type: "text"`                                                                             |
| `field_type: email`                                   | `type: "email"`                                                                            |
| `field_type: phone`                                   | `type: "tel"`                                                                              |
| `field_type: select` + `field_options[{label,value}]` | `type: "select"`, `options: [{label, value}]`                                              |
| `field_type: checkbox`                                | `type: "checkbox"`                                                                         |
| `field_type: file` (`type_file: image`)               | `type: "image"`, `uploadId: <the field's _id>`, `accept: "image/*,.heic,.heif,.pdf"`       |
| `field_type: hidden`                                  | skip (it was the old captcha token field)                                                  |
| other types                                           | stop and tell the user: not covered by the reference                                       |

Config mode with a campaign also needs `upload: { program: PROGRAM_ID, action: API_BASE }`.

## What the campaign settings give (POST `api.helloprobability.io/service/get-form-fields/{id}?frm=new`, body `{env}`)

| Key                                 | Used for                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `google_analytics`                  | **not used**: the GA ID is always asked to the user (`GA_MEASUREMENT_ID`) |
| `eiCaptchaEnabled`                  | turns the EI captcha on                                                   |
| `dateValidations`                   | campaign window (config mode)                                             |
| `fields`                            | config mode fields                                                        |
| `thank_you_title`, `thank_you_copy` | **not used**: the thank-you is the fixed bilingual default                |

## Smarty in the front end

- `ADDRESS_FIELD` = the address field's `name`. The dropdown fills **one field** with
  "street secondary, city, ST zip".
- `/api/address/autocomplete` is resolved by `embedOrigin()`: `VITE_API_ORIGIN` (production) →
  the bundle's own URL → the page origin.
- Strict: a typed (not picked) address blocks the submission. Works only when the component
  submits (`SEND_TO_PROBABILITY = false`).

## Checkbox errors

- Universal Form puts a checkbox's error as `p.field-required-error` next to `<uf-checkbox>` in
  `.field-wrapper` (light DOM); `uf-checkbox` itself gets no invalid attribute, and its box is in
  its shadow root.
- The SCSS hides that message visually (screen readers still get it) and, while it exists, sets
  `--uf-checkbox-label-color`, `--uf-checkbox-link-color` and `--uf-required-color` to the error
  color on that `uf-checkbox`: the label text turns the error color; the box is not painted.

## Receipt

- Images → Universal Form's cropper; the component stretches the crop box to the whole image.
  After cropping, the box shows FilePond's own preview (cropped image + file name, size, ×).
  Never cover it with an "upload complete" veil/check/text, even if the design has one.
- PDF → cropper off for that pick; `pdf-preview.png` shown in the box (`data-file-kind="pdf"`).
- HEIC/HEIF → converted to JPEG before Universal Form sees it (native decode, then heic2any).
  heic2any needs `unsafe-eval` + `worker-src blob:` — on a consumer page with a strict CSP only
  the native path works (Safari/iOS).
- blob: images blocked by the host CSP → swapped for data: URLs.
- Crop modal: appended to `document.body`, outside the component; only `.uf-crop-overlay` and
  `.uf-crop-img` are known in advance. Inspect it in the browser to style the rest.

## Submission (component submits)

1. Universal Form validates and uploads, then fires `uf-submit` `{ values, metadata }`
   (`metadata` = utm_*, url, referrer, fingerprint).
2. Component checks: address picked (address module), captcha token (captcha module). With the
   captcha module the submit button is already disabled until the captcha is solved, and again
   when its token expires (see `references/ei-captcha.md`); this check is the fallback.
3. POST JSON `{ ...values, ...metadata, captchaTokenEI? }` to
   `api.helloprobability.io/submission/{env}/{id}` (config mode with a Probability program ID) or `CUSTOM_SUBMIT_URL`.
4. `statusCode === 200` (campaign) / 2xx (custom endpoint) → thank-you screen, fixed default for
   every project (bilingual):
   > **THANK YOU!** Your entry has been received. Good luck!
   > **GRACIAS!** Ya recibimos tu inscripción. ¡Buena suerte!
5. Error → "Sorry!" screen:
   - **Entry limit reached** → the backend's own message (`error.detail`).
   - **Any other error** (API or network) → "Thank you for your patience, please try again to enter."
   - **PENDING CONFIRMATION:** how the backend signals the entry limit. `isEntryLimitError()` in the
     template currently matches HTTP 429 or a `detail` containing "limit". Once the real response
     is known (status code, error code or exact text), replace that rule in the template and here.

## Analytics events (all kept in every project)

| Event                    | When                                                                                                     | Params                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `submit_click`           | every click on the submit button, before validation (the "GA datalayer on Submit button" briefs ask for) | —                                       |
| `entry_success`          | submission accepted                                                                                      | —                                       |
| `entry_error`            | submission refused / network failure                                                                     | `reason`: `limit` \| `api` \| `network` |
| `receipt_upload_success` | a file was picked                                                                                        | `file_kind`: `pdf` \| `image`           |
| `receipt_upload_error`   | HEIC conversion failed                                                                                   | `file_kind`: `heic`                     |
| `form_load_error`        | Universal Form script or campaign settings unreachable                                                   | —                                       |
| `scroll_depth`           | page scrolled past 25/50/75/100%                                                                         | `percent_scrolled`                      |

Never send personal data as an event param.

## Copy from the brief (checklist)

The texts the reference project carries — look for each one in the brief:

| #   | Text                       | Reference project's version                                                                                                                                                                                                                                                                                            | Goes to                         |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Legal checkbox             | "I confirm that I am a legal resident of the 50 U.S./D.C., or Puerto Rico, meet the age-of-majority requirements for my jurisdiction, and have read and agree to the Official Rules, Sponsor's Terms of Use, and Privacy Notice." + Spanish version, links to Official Rules (EN and ES), Terms of Use, Privacy Notice | `label` + `labelHtml`           |
| 2   | Opt-in checkbox            | "Yes, I'd like to receive emails with updates, special offers and other information from Valvoline…" + Spanish version                                                                                                                                                                                                 | `label`                         |
| 3   | Thank-you                  | default if absent: THANK YOU! / Your entry has been received. Good luck! / GRACIAS! / Ya recibimos tu inscripción. ¡Buena suerte!                                                                                                                                                                                      | `TEXT`                          |
| 4   | Section headings           | "General Info", "Upload Store Receipt"                                                                                                                                                                                                                                                                                 | `#enhanceLayout`                |
| 5   | Receipt tips band          | "Make sure your receipt is legible" + "READ OUR TIPS & TRICKS EN/ES" link                                                                                                                                                                                                                                              | `#enhanceLayout`                |
| 6   | Upload box                 | "CLICK TO UPLOAD RECEIPT" / "Click to upload or drag and drop JPG, JPEG, PNG, PDF, HEIC & HEIF (Max 30MB)"                                                                                                                                                                                                             | `$upload-title`, `$upload-hint` |
| 7   | Field labels / error texts | from the campaign; the brief only to check them                                                                                                                                                                                                                                                                        | `FORM_CONFIG` (config mode)     |

Not from the brief (fixed in the template): the error screen ("Sorry!" + the generic error or the
backend's entry-limit message), the load error, the address/captcha/HEIC messages. Opening and
closing messages come from the campaign (get-form-fields).
