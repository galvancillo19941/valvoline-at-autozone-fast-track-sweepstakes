# EI captcha — reference

Replaces Cloudflare Turnstile (which the reference project used). Used in config mode with a
Probability program ID, when get-form-fields returns `eiCaptchaEnabled: true`. That program ID is
the `program-id`: it is never asked again. Not used in program mode (no get-form-fields there).

Implementation for the embed: region `captcha` of `templates/frontend/component/component.ts.template`.

## Values

| Value            | Source                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `program-id`     | the Probability program ID (same as get-form-fields and the submission URL)                                                                                                                                                                      |
| `api-url`        | `https://entryintelligence.helloprobability.io` — fixed for every program (`EI_CAPTCHA_API_URL` in the template). Confirmed 2026-11-17: used by another program in production, and it serves the widget. The widget strips a trailing `/` itself |
| widget script    | `https://entryintelligence.helloprobability.io/static/captcha/widget.js` (classic script)                                                                                                                                                        |
| token field name | `captchaTokenEI`                                                                                                                                                                                                                                 |
| CSP              | add `https://entryintelligence.helloprobability.io` to `domains.config.json`                                                                                                                                                                     |

## Widget facts (read from widget.js, 2026-11-17)

- Defines `<ei-captcha>`; observes `program-id` and `api-url`.
- Calls `{api-url}/api/captcha/generate/{program-id}` and `{api-url}/api/captcha/validate`.
- Events (bubbling): `ei:ready`, `ei:success` (`detail.verifiedToken`), `ei:expired`,
  `ei:error`. The template handles success, expired and error.

## Original integration doc (verbatim from the user)

```html
<!-- 1. Load the widget (once, e.g. in <head>) -->
<script src="https://your-backend-domain.com/static/captcha/widget.js" defer></script>

<!-- 2. Hidden input to carry the verified token in the form submit.
     Probability Tool forms send it as captchaTokenEI. -->
<input type="hidden" id="captchaTokenEI" name="captchaTokenEI" />

<!-- 3. Place the CAPTCHA element -->
<ei-captcha
  program-id="6af4f1a30b9ed07485efcb2d"
  api-url="https://your-backend-domain.com"
></ei-captcha>

<!-- 4. Listen for completion and store the verified token -->
<script>
  document.querySelector("ei-captcha").addEventListener("ei:success", (e) => {
    const { verifiedToken } = e.detail ?? {};
    document.getElementById("captchaTokenEI").value = verifiedToken ?? "";
    document.getElementById("submitBtn").disabled = false;
  });
</script>

<!-- 5. On your SERVER, verify the token before processing the form:
  POST https://your-backend-domain.com/api/captcha/verify-token
  Body: { "verifiedToken": "<value from the hidden input>", "programId": "6af4f1a30b9ed07485efcb2d" }
  Response: { "valid": true, "programId": "..." }

  - The token is single-use and expires after the program's "Time to submit after solving"
    (120 s by default). The widget fires ei:expired and asks again before that happens.
  - Reject the form submission if valid !== true.
  - Sending programId rejects tokens solved on another program (reason: "program_mismatch").
-->
```

## How it maps onto the embed

- Step 1: the component injects the widget script itself (the consumer page only pastes our bundle).
- Step 2: no hidden input. The component keeps the token in memory and adds
  `captchaTokenEI: <token>` to the submission body.
- Step 3: `<ei-captcha>` is mounted in a box of ours at the end of the fields, above the submit
  button, and re-mounted if Universal Form re-renders its fields.
- Step 4: `ei:success` stores `e.detail.verifiedToken`; `ei:expired` and `ei:error` clear it.
- **Submit button locked without a token (always, in every project with the captcha):** the
  button (`button[type=submit]` inside `<uf-submit-button>`'s shadow root) starts **disabled**
  and is enabled only on `ei:success`. It is disabled again when the token expires
  (`ei:expired`, after the program's "time to submit after solving", 120 s by default — the
  message "The security check expired. Please complete it again." shows and the widget asks for a
  new solve), on `ei:error`, and whenever the widget is re-mounted. `#syncSubmitLock()` in the
  template does it; it runs from the three events and every 250ms from `#enhanceCaptcha` (Universal
  Form may re-render the button enabled). It only lifts a lock it set itself (`data-captcha-lock`),
  because Universal Form disables the button on its own while submitting. The disabled state is
  made visible in `SHADOW_CSS` (`opacity: 0.5`, `cursor: not-allowed`): Universal Form's own
  disabled style only changes the cursor.
- Fallback: if `uf-submit` still arrives without a token (e.g. Enter in a field), it shows "Please
  complete the security check, then submit again." and sends nothing.
- Verifying it: the real widget refuses answers typed by browser automation (bot detection), so
  check the transitions by dispatching `ei:success` (`detail.verifiedToken`), `ei:expired` and
  `ei:error` on `<ei-captcha>`, and ask the user to solve it once by hand.
- Step 5: the submission goes to Probability (`/submission/{env}/{programId}`), which is the
  "server" here; the doc says Probability Tool forms send the token as `captchaTokenEI`.
  **To confirm with the Probability team:** that the submission endpoint verifies
  `captchaTokenEI` itself. If it doesn't, the verify call has to be added to our Express
  before forwarding, and this reference must be updated.
- The token is single-use: after a failed submission the widget must be solved again.
