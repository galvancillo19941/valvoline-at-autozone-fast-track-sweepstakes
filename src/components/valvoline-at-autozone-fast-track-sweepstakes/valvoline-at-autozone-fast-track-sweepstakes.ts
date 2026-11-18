// =============================================================================
// Embed component template — generated from the reference project
// (probability-valvoline-oil-change-us-sweepstakes), generalized.
//
// Placeholders (replace all): valvoline-at-autozone-fast-track-sweepstakes ValvolineAtAutozoneFastTrackSweepstakes 6af4f1a30b9ed07485efcb2d
// Values marked "FILL:" come from the user's answers or the Figma design.
// Optional modules are wrapped in `// #region <name>` … `// #endregion <name>`:
//   address  — Smarty autocomplete on the address field
//   receipt  — upload field: PDF without cropper, HEIC → JPEG, full-image crop, blob fallback
//   captcha  — EI captcha (only when the campaign has eiCaptchaEnabled)
//   submit   — the component posts the entry itself (removed when SEND_TO_PROBABILITY = true)
// Delete a whole region (markers included) when its module doesn't apply; keep the
// markers otherwise. Don't touch code outside regions except the FILL: values.
// =============================================================================

import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { initAnalytics, track, trackScrollDepth } from "../../lib/analytics";
import { injectPreconnect, injectScript, injectStylesheet } from "../../lib/inject-script";
import { injectStyles } from "../../lib/inject-styles";
import {
  attachAddressAutocomplete,
  type AddressAutocomplete,
} from "../../lib/address-autocomplete";
import { installBlobImageFallback } from "../../lib/blob-image-fallback";
import { heicToJpeg, isHeic, isPdf } from "../../lib/heic-to-jpeg";
import styles from "./valvoline-at-autozone-fast-track-sweepstakes.scss?inline";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Two ways to build the form (FILL:):
// "program": the user had a Universal Form campaign ID. <universal-form program>
//            loads fields, conditions and dates from Universal Form's own backend.
//            get-form-fields is NOT used.
// "config":  the user had no Universal Form campaign ID and gave the fields
//            (FORM_CONFIG). PROGRAM_ID is then the Probability program ID asked
//            afterwards, used for get-form-fields (dates, captcha) and the submit.
const FORM_MODE = "config" as "program" | "config";

// program mode: the Universal Form campaign ID.
// config mode:  the Probability program ID ("" only if the user has none at all).
const PROGRAM_ID: string = "6af4f1a30b9ed07485efcb2d";

// Config mode with a Probability program ID: get-form-fields (dates, captcha) and
// the submission go to api.helloprobability.io with that ID.
const USES_PROBABILITY_API = FORM_MODE === "config" && PROGRAM_ID !== "";

// Program mode only: true = Universal Form stores the entry itself (`send`) and
// shows the campaign's thank-you; the component can't stop a submission then.
// false = the component receives `uf-submit` and posts it to CUSTOM_SUBMIT_URL.
// FILL: (always false in config mode)
const SEND_TO_PROBABILITY = false;

// Where the entry is POSTed when it is NOT the Probability API: program mode
// without `send`, or config mode without a program ID. FILL: or leave "".
const CUSTOM_SUBMIT_URL = "";

// GA4 Measurement ID — always asked to the user, in every mode (it never comes
// from the campaign). "" = no analytics from the component.
const GA_MEASUREMENT_ID = "G-6DGBLP4DXB";

// Config mode — the campaign's fields (get-form-fields, active ones). Names are
// the campaign's own: the submission only accepts those. Order follows the
// Figma layout (email + phone share a row, then the address on its own).
// Checkbox copy comes from the brief (it supersedes the campaign's labels).
// The Official Rules link is "To Follow" in the brief: add it to both
// languages of the legal checkbox once it exists.
const FORM_CONFIG: Record<string, unknown> = {
  // Receipts go to POST {action}/api/files/upload/{program}/{uploadId}.
  // `action` is API_BASE (declared further down, so spelled out here).
  upload: { program: PROGRAM_ID, action: "https://api.helloprobability.io" },
  fields: [
    {
      type: "text",
      name: "first_name",
      label: "First Name",
      placeholder: "First Name",
      required: true,
      errorMessage: "Please enter your first name",
    },
    {
      type: "text",
      name: "last_name",
      label: "Last Name",
      placeholder: "Last Name",
      required: true,
      errorMessage: "Please enter your last name",
    },
    {
      type: "email",
      name: "email_address",
      label: "Email Address",
      placeholder: "Email Address",
      required: true,
      errorMessage: "Please enter your email address",
    },
    {
      type: "tel",
      name: "phone_number",
      label: "Phone Number",
      placeholder: "Phone Number",
      required: true,
      errorMessage: "Please enter your phone number",
    },
    {
      type: "text",
      name: "street_address",
      label: "Street Address",
      placeholder: "Street Address",
      required: true,
      errorMessage: "Please enter your street address",
    },
    {
      type: "image",
      name: "upload_receipt",
      label: "Upload Receipt",
      required: true,
      uploadId: "6af4f1a30b9ed07485efcb34",
      errorMessage: "Please upload a receipt",
      accept: "image/*,.heic,.heif,.pdf",
    },
    {
      // field_type "optin" in the campaign: rendered as an optional checkbox.
      type: "checkbox",
      name: "optin_field",
      label:
        "Yes, I'd like to receive emails with updates, special offers and other information from Valvoline. I understand I may unsubscribe at any time. / Sí, me gustaría recibir correos electrónicos con actualizaciones, ofertas especiales y otra información de Valvoline. Entiendo que puedo cancelar mi suscripción en cualquier momento.",
      required: false,
    },
    {
      type: "checkbox",
      name: "p_i_confirm_that_i_am_a_legal_resident_o",
      // Plain-text fallback; the form renders `labelHtml` (sanitized: only a/strong/em/br/p) when present.
      label:
        "I confirm that I am a legal resident of the 50 U.S./D.C., meet the age-of-majority requirements for my jurisdiction, have an AutoZone Rewards account in good standing and have read and agree to the Official Rules, Sponsor's Terms of Use, and Privacy Notice. / Confirmo que soy residente legal de los 50 estados de EE. UU. o del Distrito de Columbia, cumplo con los requisitos de mayoría de edad de mi jurisdicción, poseo una cuenta de AutoZone Rewards que se encuentra al día, y he leído y acepto las Reglas Oficiales, los Términos de Uso del patrocinador y el Aviso de Privacidad.",
      labelHtml:
        '<p>I confirm that I am a legal resident of the 50 U.S./D.C., meet the age-of-majority requirements for my jurisdiction, have an AutoZone Rewards account in good standing and have read and agree to the Official Rules, Sponsor\'s <a href="https://www.valvolineglobal.com/en/legal-notices/terms-of-use/" rel="noopener noreferrer" target="_blank">Terms of Use</a>, and <a href="https://www.valvolineglobal.com/en/legal-notices/privacy-policy/" rel="noopener noreferrer" target="_blank">Privacy Notice</a>. / Confirmo que soy residente legal de los 50 estados de EE. UU. o del Distrito de Columbia, cumplo con los requisitos de mayoría de edad de mi jurisdicción, poseo una cuenta de AutoZone Rewards que se encuentra al día, y he leído y acepto las Reglas Oficiales, los <a href="https://www.valvolineglobal.com/en/legal-notices/terms-of-use/" rel="noopener noreferrer" target="_blank">Términos de Uso</a> del patrocinador y el <a href="https://www.valvolineglobal.com/en/legal-notices/privacy-policy/" rel="noopener noreferrer" target="_blank">Aviso de Privacidad</a>.</p>',
      required: true,
      errorMessage: "Required field",
    },
  ],
};

// Grid rows, e.g. [["1fr", "1fr"], ["1fr"]] (two fields side by side, then one).
// [] = Universal Form's default layout. FILL: from the Figma design.
// Never undefined: Universal Form crashes on it ("reading 'length'") and renders
// nothing (verified 2026-11-17).
// First + last name, email + phone, then the address on its own row.
const FORM_SKELETON: string[][] = [["1fr", "1fr"], ["1fr", "1fr"], ["1fr"]];

// Design tokens used inside Universal Form's shadow roots (SHADOW_CSS below).
// FILL: from the Figma design. Keep them in sync with the SCSS tokens.
const THEME = {
  font: '"Barlow", sans-serif',
  buttonFont: '"Passion One", sans-serif',
  inputText: "#616161",
  inputBorder: "#ffffff",
  inputBg: "#ffffff",
  focus: "#e50d11",
  valid: "#27a844",
  radius: "4px",
  suggestionsBorder: "#8a8c8e",
  suggestionHoverBg: "#e50d11",
  suggestionHoverText: "#ffffff",
};

// Google Fonts used by the design. FILL: from the Figma design.
const FONT_URLS: string[] = [
  "https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Passion+One&family=Work+Sans&display=swap",
];

// Copy shown by the component itself.
// Thank-you: the brief's thank-you copy if it has one (EN and/or ES); otherwise
// keep these defaults (the reference project's bilingual thank-you). If the brief
// has only one language, set the other pair to "" and drop its <h2>/<p> in render().
const TEXT = {
  thankYouTitle: "THANK YOU!",
  thankYouBody:
    "Please allow up to eight (8) weeks for processing and delivery of your Gift (assuming your submission is deemed valid). Gift available while supplies last.",
  thankYouTitleEs: "¡GRACIAS!",
  thankYouBodyEs:
    "Por favor, ten en cuenta que el procesamiento y la entrega de tu obsequio pueden tardar hasta ocho (8) semanas (siempre que tu solicitud sea considerada válida). El obsequio está disponible hasta agotar existencias.",
  errorTitle: "Sorry!",
  // Any submission error that is not the entry limit (the entry-limit error shows
  // the backend's own message instead).
  submitError: "Thank you for your patience, please try again to enter.",
  loadError: "We couldn't load the form. Please reload the page or try again later.",
};

// ---------------------------------------------------------------------------
// Fixed — same for every project
// ---------------------------------------------------------------------------

const UNIVERSAL_FORM_SRC = "https://universal-form.onprobability.com/v1/dist/index.js";
const API_BASE = "https://api.helloprobability.io";
const FONT_PRECONNECTS: [href: string, crossOrigin: boolean][] = [
  ["https://fonts.googleapis.com", false],
  ["https://fonts.gstatic.com", true],
];

// `name` of the Universal Form field that gets the Smarty suggestions. FILL:
const ADDRESS_FIELD = "street_address";

// EI captcha (see references/ei-captcha.md). The Probability program ID is its program-id.
// Same backend for every program (confirmed: it serves widget.js and the captcha API).
const EI_CAPTCHA_API_URL = "https://entryintelligence.helloprobability.io";
const EI_CAPTCHA_SCRIPT_URL = `${EI_CAPTCHA_API_URL}/static/captcha/widget.js`;
const EI_CAPTCHA_TOKEN_FIELD = "captchaTokenEI";
// How long to wait for the widget script before telling the visitor it did not load.
const CAPTCHA_LOAD_TIMEOUT_MS = 15_000;

// The program's settings (POST /service/get-form-fields/{program}), config mode
// with a Probability program ID only: campaign window and captcha switch.
interface DateValidations {
  startDate?: string;
  startDateMessage?: string;
  endDate?: string;
  endDateMessage?: string;
}

interface ProgramSettings {
  campaignWindow: Record<string, unknown>;
  captchaEnabled: boolean;
  // The settings request failed (blocked, offline or API error).
  failed?: boolean;
}

async function fetchProgramSettings(programId: string, env: string): Promise<ProgramSettings> {
  const failed: ProgramSettings = { campaignWindow: {}, captchaEnabled: false, failed: true };
  try {
    const response = await fetch(`${API_BASE}/service/get-form-fields/${programId}?frm=new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ env }),
    });
    const body = (await response.json()) as {
      data?: { dateValidations?: DateValidations; eiCaptchaEnabled?: boolean };
    };
    if (!response.ok || !body.data) return failed;

    const campaignWindow: Record<string, unknown> = {};
    const dates = body.data.dateValidations;
    if (dates?.startDate) {
      campaignWindow.opensAt = dates.startDate;
      if (dates.startDateMessage?.trim())
        campaignWindow.pending = {
          title: TEXT.errorTitle,
          description: dates.startDateMessage.trim(),
        };
    }
    if (dates?.endDate) {
      campaignWindow.closesAt = dates.endDate;
      if (dates.endDateMessage?.trim())
        campaignWindow.closed = {
          title: TEXT.errorTitle,
          description: dates.endDateMessage.trim(),
        };
    }
    return { campaignWindow, captchaEnabled: body.data.eiCaptchaEnabled === true };
  } catch {
    return failed;
  }
}

// The backend refuses an entry over the program's entry limit; that error shows
// the backend's own message, every other error shows TEXT.submitError.
// PROVISIONAL RULE — the exact response for the entry limit is not documented
// yet: it currently matches an HTTP 429 or a `detail` that mentions "limit".
// Replace it with the confirmed field/value (see references/frontend.md).
function isEntryLimitError(status: number, detail: string | undefined): boolean {
  return status === 429 || /limit/i.test(detail ?? "");
}

// Text, email, tel, select, checkbox and the submit button render inside their
// own shadow roots, which page CSS can't reach (only --uf-* variables cross).
// This is injected into each of those roots: floating labels resting inside the
// field, the green check on valid fields, input/select/button sizing. The
// placeholder (set equal to the label) only exists so :placeholder-shown can tell
// an empty field from a filled one; it is never visible.
const SHADOW_CSS = `
  .field { position: relative; }
  .field > label {
    display: block !important;
    position: absolute;
    top: 50%;
    left: 12px;
    z-index: 1;
    max-width: calc(100% - 26px);
    margin: 0 !important;
    padding: 0 2px;
    transform: translateY(-50%);
    font: 400 16px/normal ${THEME.font} !important;
    color: ${THEME.inputText} !important;
    pointer-events: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: top 250ms cubic-bezier(0.5, 0, 0.1, 1), transform 250ms cubic-bezier(0.5, 0, 0.1, 1), font-size 250ms cubic-bezier(0.5, 0, 0.1, 1);
  }
  .field > label .required { display: none; }
  .field:has(input:not([type="checkbox"]):not(:placeholder-shown):valid:not([aria-invalid="true"]))::after,
  .field:has(select:not(.placeholder-selected):valid)::after {
    content: "";
    position: absolute;
    top: 25px;
    right: 12px;
    width: 12px;
    height: 9px;
    transform: translateY(-50%);
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 9'%3E%3Cpath d='M1 4.5l3.5 3.5L11 1' fill='none' stroke='${encodeURIComponent(THEME.valid)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
    pointer-events: none;
  }
  .field:has(select)::after { right: 36px !important; }
  .field:has(input:focus) > label,
  .field:has(input:not(:placeholder-shown)) > label,
  .field:has(select:focus) > label,
  .field:has(select:not(.placeholder-selected)) > label {
    top: 8px;
    transform: none;
    font-size: 12px !important;
  }
  input:not([type="checkbox"]), select {
    box-sizing: border-box;
    width: 100%;
    height: 50px !important;
    padding: 20px 0.75rem 0 !important;
    font-family: ${THEME.font} !important;
    font-size: 16px !important;
    font-weight: 400 !important;
    color: ${THEME.inputText} !important;
    background: ${THEME.inputBg} !important;
    border: 1px solid ${THEME.inputBorder} !important;
    border-radius: ${THEME.radius} !important;
    box-shadow: none !important;
  }
  input:not([type="checkbox"]):focus, select:focus { border-color: ${THEME.focus} !important; outline: none; }
  input::placeholder { color: transparent !important; opacity: 0 !important; }
  select { padding-top: 16px !important; }
  select.placeholder-selected:not(:focus) { color: transparent !important; }
  .field .label { font-size: 14px; line-height: 20px; }
  input[type="checkbox"] {
    width: 20px !important;
    height: 20px !important;
    accent-color: ${THEME.focus};
  }
  .rich a { transition: color 150ms; }
  .rich a:hover, .rich a:focus-visible { color: ${THEME.focus} !important; }
  button[type="submit"] {
    width: 100% !important;
    font-family: ${THEME.buttonFont} !important;
    font-weight: 400 !important;
    text-transform: uppercase !important;
  }
  /* Locked until the captcha is solved (see #syncSubmitLock). */
  button[type="submit"]:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
  /* Address typed but not picked from the suggestions: no green check. */
  .valvoline-at-autozone-fast-track-sweepstakes__address-invalid::after { display: none !important; }
  .input-wrap { position: relative; }
  .valvoline-at-autozone-fast-track-sweepstakes__suggestions {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20;
    margin: 0; padding: 0; list-style: none; background: ${THEME.inputBg};
    border: 1px solid ${THEME.suggestionsBorder}; border-radius: ${THEME.radius};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); max-height: 220px; overflow-y: auto;
  }
  .valvoline-at-autozone-fast-track-sweepstakes__suggestions[hidden] { display: none; }
  .valvoline-at-autozone-fast-track-sweepstakes__suggestion {
    margin: 0; padding: 8px 12px; font: 14px/20px ${THEME.font};
    color: ${THEME.inputText}; cursor: pointer; list-style: none; text-align: left;
  }
  .valvoline-at-autozone-fast-track-sweepstakes__suggestion:hover { background: ${THEME.suggestionHoverBg}; color: ${THEME.suggestionHoverText}; }
`;

// The remote uf-image-upload keeps its Cropper.js instance on `_cropper` (an
// internal, not API). Everything that touches it is optional-chained so that a
// change upstream degrades to the library's own default instead of throwing.
interface CropperLike {
  getCanvasData(): object;
  setCropBoxData(data: object): unknown;
}
type ImageUploadElement = HTMLElement & { cropper?: boolean; _cropper?: CropperLike | null };

// Receipt tips page linked from the tips band. Valvoline's shared receipt tips
// page (the brief has no link of its own) — PENDING client confirmation.
const TIPS_URL = "https://promotions.valvolineglobal.com/tipsandtricks-en-es";

function makeHeading(text: string): HTMLElement {
  const heading = document.createElement("div");
  heading.className = "valvoline-at-autozone-fast-track-sweepstakes__section-heading";
  heading.innerHTML = `<span class="valvoline-at-autozone-fast-track-sweepstakes__section-text">${text}</span><span class="valvoline-at-autozone-fast-track-sweepstakes__section-line"></span>`;
  return heading;
}

injectStyles("valvoline-at-autozone-fast-track-sweepstakes", styles);

@customElement("valvoline-at-autozone-fast-track-sweepstakes")
export class ValvolineAtAutozoneFastTrackSweepstakes extends LitElement {
  @property({ type: String, attribute: "program_id" })
  programId = PROGRAM_ID;

  // "test" while building; switched to "prod" only by the go-to-production workflow.
  @property({ type: String })
  env = "test";

  // 0 = form, 1 = thank you, 2 = submission/load error.
  @property({ type: Number })
  submitted = 0;

  // Spinner until the form has rendered and #enhanceForm has styled it.
  @property({ type: Boolean })
  loader = true;

  // Config mode only: FORM_CONFIG plus the campaign window; null until ready.
  @state()
  private formConfig: Record<string, unknown> | null = null;

  #submitError = "";
  #stopScrollTracking?: () => void;
  #enhanceTimer?: number;
  #submitClickAttached = false;

  #addressAttached = false;
  #address?: AddressAutocomplete;

  #uploadAttached = false;
  #uploadObserver?: MutationObserver;
  #cropModalObserver?: MutationObserver;

  #captchaEnabled = false;
  #captchaToken = "";
  #captchaWaitingSince = 0;

  #handleSubmit = (event: Event): void => {
    const { values, metadata } = (
      event as CustomEvent<{ values: Record<string, unknown>; metadata?: Record<string, unknown> }>
    ).detail;
    // Universal Form has already validated the fields and uploaded any file by the
    // time it fires uf-submit; holding the entry back here only costs a second click.
    // The address must be one picked from the Smarty suggestions; the form itself
    // only checks it isn't empty.
    if (this.#address && !this.#address.isValid()) {
      this.#address.showError();
      return;
    }
    if (this.#captchaEnabled && !this.#captchaToken) {
      this.#setCaptchaMessage("Please complete the security check, then submit again.");
      return;
    }
    // `metadata` holds the visit's utm_*, url, referrer and fingerprint. The body is
    // flat, so merge it the way the form's own `send` mode would.
    void this.#submit({
      ...values,
      ...metadata,
      ...(this.#captchaEnabled ? { [EI_CAPTCHA_TOKEN_FIELD]: this.#captchaToken } : {}),
    });
  };

  async #submit(entries: Record<string, unknown>): Promise<void> {
    const url = USES_PROBABILITY_API
      ? `${API_BASE}/submission/${this.env}/${this.programId}`
      : CUSTOM_SUBMIT_URL;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });
      const result = (await response.json().catch(() => ({}))) as {
        statusCode?: number;
        error?: { detail?: string };
      };
      // Probability answers { statusCode: 200 } in the body; a custom endpoint just needs a 2xx.
      const ok = USES_PROBABILITY_API ? result.statusCode === 200 : response.ok;
      if (ok) {
        this.submitted = 1;
        track("entry_success");
      } else {
        const detail = result.error?.detail?.trim();
        const limit = isEntryLimitError(response.status, detail);
        this.#submitError = limit && detail ? detail : TEXT.submitError;
        this.submitted = 2;
        track("entry_error", { reason: limit ? "limit" : "api" });
      }
    } catch {
      this.#submitError = TEXT.submitError;
      this.submitted = 2;
      track("entry_error", { reason: "network" });
    }
  }

  // Mounts <ei-captcha> in a box of ours at the end of the fields, just above the
  // submit button. Idempotent: if the form re-renders its fields and drops the box,
  // a new widget is mounted (a token only belongs to its own widget).
  #enhanceCaptcha(fields: Element): void {
    if (!this.#captchaEnabled) return;

    if (!fields.querySelector(`.valvoline-at-autozone-fast-track-sweepstakes__captcha`)) {
      this.#captchaToken = "";
      const box = document.createElement("div");
      box.className = "valvoline-at-autozone-fast-track-sweepstakes__captcha";
      const widget = document.createElement("ei-captcha");
      widget.setAttribute("program-id", this.programId);
      widget.setAttribute("api-url", EI_CAPTCHA_API_URL);
      widget.addEventListener("ei:success", (event) => {
        const { verifiedToken } = (event as CustomEvent<{ verifiedToken?: string }>).detail ?? {};
        this.#captchaToken = verifiedToken ?? "";
        this.#setCaptchaMessage("");
        this.#syncSubmitLock();
      });
      // Single-use token that expires after the program's "time to submit after
      // solving" (120 s by default): the button locks again and the widget asks
      // for a new solve by itself.
      widget.addEventListener("ei:expired", () => {
        this.#captchaToken = "";
        this.#setCaptchaMessage("The security check expired. Please complete it again.");
        this.#syncSubmitLock();
      });
      widget.addEventListener("ei:error", () => {
        this.#captchaToken = "";
        this.#setCaptchaMessage(
          "We couldn't complete the security check. Please reload the page and try again.",
        );
        this.#syncSubmitLock();
      });
      const message = document.createElement("p");
      message.className = "valvoline-at-autozone-fast-track-sweepstakes__captcha-message";
      message.setAttribute("role", "alert");
      message.hidden = true;
      box.append(widget, message);
      fields.append(box);
    }

    // The element upgrades by itself once the widget script defines it.
    if (!customElements.get("ei-captcha")) {
      this.#captchaWaitingSince ||= Date.now();
      if (Date.now() - this.#captchaWaitingSince > CAPTCHA_LOAD_TIMEOUT_MS) {
        this.#setCaptchaMessage(
          "We couldn't load the security check. Please reload the page or try another browser.",
        );
      }
    }

    // Runs every 250ms with #enhanceForm: Universal Form may re-render its
    // submit button, which would come back enabled.
    this.#syncSubmitLock();
  }

  // The submit button stays disabled until the captcha is solved, and is
  // disabled again whenever the token is gone (expired, widget error, widget
  // re-mounted). Only a lock this component set is lifted: Universal Form
  // disables the button itself while it is submitting.
  #syncSubmitLock(): void {
    const button = this.querySelector("uf-submit-button")?.shadowRoot?.querySelector<HTMLButtonElement>(
      "button[type='submit']",
    );
    if (!button) return;
    const locked = this.#captchaEnabled && !this.#captchaToken;
    if (locked && !button.disabled) {
      button.disabled = true;
      button.dataset.captchaLock = "";
    } else if (!locked && "captchaLock" in button.dataset) {
      button.disabled = false;
      delete button.dataset.captchaLock;
    }
  }

  #setCaptchaMessage(message: string): void {
    const el = this.querySelector<HTMLElement>(
      ".valvoline-at-autozone-fast-track-sweepstakes__captcha-message",
    );
    if (!el) return;
    el.textContent = message;
    el.hidden = message === "";
  }

  // The cropper modal lives in document.body, not in this element, and the library
  // opens its crop box at 85% of the image with no option to change it. When the
  // modal's <img> reports `ready`, stretch the box over the whole image.
  #watchCropModal(): void {
    this.#cropModalObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.matches(".uf-crop-overlay")) continue;
          node.querySelector(".uf-crop-img")?.addEventListener(
            "ready",
            () => {
              const cropper = this.querySelector<ImageUploadElement>("uf-image-upload")?._cropper;
              cropper?.setCropBoxData(cropper.getCanvasData());
            },
            { once: true },
          );
        }
      }
    });
    this.#cropModalObserver.observe(document.body, { childList: true });
  }

  // Images go through Universal Form's cropper, which can't open a PDF (it hangs)
  // nor a HEIC (no browser renders one in an <img>). A PDF is sent as-is by turning
  // the cropper off for that pick; a HEIC is swapped for a JPEG before FilePond
  // ever sees it. Both run in the capture phase.
  #setupUploadField(upload: ImageUploadElement): void {
    if (this.#uploadAttached) return;
    this.#uploadAttached = true;

    // FilePond can't draw a PDF: flag the field while it holds one and let the
    // stylesheet show the PDF artwork. Read from the file name in the DOM, not
    // from the pick/drop events (FilePond's clean-up would wipe that state).
    const syncFileKind = (): void => {
      const name = upload.querySelector(".filepond--file-info-main")?.textContent ?? "";
      if (/\.pdf$/i.test(name.trim())) upload.dataset.fileKind = "pdf";
      else delete upload.dataset.fileKind;
    };
    this.#uploadObserver = new MutationObserver(syncFileKind);
    this.#uploadObserver.observe(upload, { childList: true, subtree: true, characterData: true });

    const setCropper = (files: FileList | null | undefined): void => {
      const file = files?.[0];
      if (file) upload.cropper = !isPdf(file);
    };
    upload.addEventListener(
      "drop",
      (event) => setCropper((event as DragEvent).dataTransfer?.files),
      true,
    );
    upload.addEventListener(
      "change",
      (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
        const file = input.files?.[0];
        if (!file) return;
        this.#clearUploadError();
        setCropper(input.files);
        if (!isHeic(file)) {
          track("receipt_upload_success", { file_kind: isPdf(file) ? "pdf" : "image" });
          return;
        }

        event.stopImmediatePropagation();
        upload.style.opacity = "0.5";
        upload.style.pointerEvents = "none";
        heicToJpeg(file)
          .then((jpeg) => {
            const transfer = new DataTransfer();
            transfer.items.add(jpeg);
            input.files = transfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          })
          .catch((error: unknown) => {
            console.error("HEIC conversion error:", error);
            track("receipt_upload_error", { file_kind: "heic" });
            input.value = "";
            this.#showUploadError(
              "We couldn't read that photo. Please try a JPG, PNG or PDF instead",
            );
          })
          .finally(() => {
            upload.style.opacity = "";
            upload.style.pointerEvents = "";
          });
      },
      true,
    );
  }

  #showUploadError(message: string): void {
    const card = this.querySelector("uf-image-upload")?.closest(".field-wrapper");
    if (!card) return;
    this.#clearUploadError();
    const el = document.createElement("p");
    el.className = "valvoline-at-autozone-fast-track-sweepstakes__upload-error";
    el.textContent = message;
    card.after(el);
  }

  #clearUploadError(): void {
    this.querySelector(".valvoline-at-autozone-fast-track-sweepstakes__upload-error")?.remove();
  }

  // Project-specific additions inside the form, from the Figma design: the
  // "General Info" / "Upload Store Receipt" headings and the receipt tips band.
  // Must be idempotent: it runs every 250ms.
  #enhanceLayout(fields: Element): void {
    const firstRow = fields.querySelector(".field-row");
    const uploadField = fields.querySelector("uf-image-upload")?.closest(".field-wrapper");
    if (!firstRow || !uploadField) return;

    if (!fields.querySelector(".valvoline-at-autozone-fast-track-sweepstakes__section-heading")) {
      firstRow.before(makeHeading("General Info"));
      uploadField.before(makeHeading("Upload Store Receipt"));
    }
    if (!fields.querySelector(".valvoline-at-autozone-fast-track-sweepstakes__tips")) {
      const tips = document.createElement("div");
      tips.className = "valvoline-at-autozone-fast-track-sweepstakes__tips";
      // A <span> and a classed <a> on purpose: valvolineglobal.com forces white
      // on every `p` and class-less `a` inside its promo blocks (!important,
      // higher specificity than ours), which would leave this band unreadable.
      tips.innerHTML = `
        <span class="valvoline-at-autozone-fast-track-sweepstakes__tips-text">Make sure your receipt is legible</span>
        <a class="valvoline-at-autozone-fast-track-sweepstakes__tips-link" href="${TIPS_URL}" target="_blank" rel="noopener noreferrer">READ OUR TIPS &amp; TRICKS</a>
      `;
      uploadField.after(tips);
    }
  }

  // Everything the form builds after we render it (shadow roots, fields) shows up
  // asynchronously, so poll briefly instead of assuming it's there.
  #enhanceForm = (): void => {
    const form = this.querySelector("universal-form");
    if (!form) return;

    // GA dataLayer event on the submit button itself (briefs ask for it), sent on
    // every click, before validation. The button lives in a shadow root: the click
    // reaches the form retargeted, composedPath() still shows the real button.
    if (!this.#submitClickAttached) {
      this.#submitClickAttached = true;
      form.addEventListener(
        "click",
        (event) => {
          const onSubmit = event
            .composedPath()
            .some((node) => node instanceof HTMLButtonElement && node.type === "submit");
          if (onSubmit) track("submit_click");
        },
        true,
      );
    }

    for (const el of form.querySelectorAll("*")) {
      const root = el.shadowRoot;
      if (!root || root.querySelector("style[data-embed-id]")) continue;
      const style = document.createElement("style");
      style.dataset.embedId = "valvoline-at-autozone-fast-track-sweepstakes";
      style.textContent = SHADOW_CSS;
      root.appendChild(style);
    }

    if (!this.#addressAttached) {
      const field = this.querySelector(`uf-text-input[name='${ADDRESS_FIELD}']`);
      const input = field?.shadowRoot?.querySelector<HTMLInputElement>("input");
      if (input) {
        this.#address = attachAddressAutocomplete(input);
        this.#addressAttached = true;
      }
    }

    // Outside the campaign window the form shows a banner instead of the fields.
    if (form.querySelector(".state-banner") && !form.querySelector(".fields")) {
      this.loader = false;
      return;
    }

    const fields = form.querySelector(".fields");
    if (!fields) return;

    const upload = form.querySelector<ImageUploadElement>("uf-image-upload");
    if (upload) this.#setupUploadField(upload);

    this.#enhanceLayout(fields);

    this.#enhanceCaptcha(fields);

    // Ready once the inputs carry our styles and, if there is an upload field,
    // FilePond has drawn its drop zone.
    const textRoot = this.querySelector("uf-text-input")?.shadowRoot;
    const styled = Boolean(
      textRoot?.querySelector("input") && textRoot.querySelector("style[data-embed-id]"),
    );
    const uploadReady =
      !form.querySelector("uf-image-upload") ||
      Boolean(form.querySelector(".filepond--drop-label"));
    if (styled && uploadReady) this.loader = false;
  };

  // Render in light DOM — without shadow DOM, styles live in <head>.
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    for (const [href, crossOrigin] of FONT_PRECONNECTS) injectPreconnect(href, crossOrigin);
    for (const href of FONT_URLS) injectStylesheet(href);
    if (!customElements.get("universal-form")) {
      injectScript(UNIVERSAL_FORM_SRC, undefined, "module", () => this.#showLoadError());
    }
    this.addEventListener("uf-submit", this.#handleSubmit);
    initAnalytics(GA_MEASUREMENT_ID);
    this.#stopScrollTracking = trackScrollDepth();
    this.#watchCropModal();
    installBlobImageFallback();

    if (USES_PROBABILITY_API) {
      // get-form-fields: campaign window and captcha switch for this program.
      void fetchProgramSettings(this.programId, this.env).then((settings) => {
        if (settings.failed) {
          this.#showLoadError();
          return;
        }
        this.#captchaEnabled = settings.captchaEnabled;
        if (settings.captchaEnabled) injectScript(EI_CAPTCHA_SCRIPT_URL);
        this.formConfig = { ...FORM_CONFIG, ...settings.campaignWindow };
      });
    } else {
      // Program mode (Universal Form loads the campaign itself) or config mode
      // without a program ID: no get-form-fields.
      if (FORM_MODE === "config") this.formConfig = FORM_CONFIG;
    }
    this.#enhanceTimer = window.setInterval(this.#enhanceForm, 250);
  }

  // The form's API or script is unreachable: swap the spinner for the error screen.
  #showLoadError(): void {
    window.clearInterval(this.#enhanceTimer);
    this.#submitError = TEXT.loadError;
    this.loader = false;
    this.submitted = 2;
    track("form_load_error");
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("uf-submit", this.#handleSubmit);
    window.clearInterval(this.#enhanceTimer);
    this.#stopScrollTracking?.();
    this.#uploadObserver?.disconnect();
    this.#cropModalObserver?.disconnect();
  }

  // After submitting, scroll to the thank-you/error message (30px above it): the
  // page stays wherever the visitor clicked submit, often below the fold.
  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (!changedProperties.has("submitted")) return;
    if (this.submitted !== 1 && this.submitted !== 2) return;
    const thankYou = this.querySelector<HTMLElement>(".thank-you");
    if (!thankYou) return;
    const targetY = thankYou.getBoundingClientRect().top + window.scrollY - 30;
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
  }

  #renderForm(): TemplateResult | typeof nothing {
    const loading = this.loader
      ? "valvoline-at-autozone-fast-track-sweepstakes__form--loading"
      : "";
    if (FORM_MODE === "program") {
      return html`<universal-form
        class=${loading}
        program=${this.programId}
        env=${this.env}
        ?send=${SEND_TO_PROBABILITY}
        .skeleton=${FORM_SKELETON}
      ></universal-form>`;
    }
    if (!this.formConfig) return nothing;
    return html`<universal-form
      class=${loading}
      config=${JSON.stringify(this.formConfig)}
      .skeleton=${FORM_SKELETON}
    ></universal-form>`;
  }

  override render(): TemplateResult {
    if (this.submitted === 1) {
      return html`
        <div class="valvoline-at-autozone-fast-track-sweepstakes">
          <div class="thank-you">
            <h2>${TEXT.thankYouTitle}</h2>
            <p>${TEXT.thankYouBody}</p>
            <h2>${TEXT.thankYouTitleEs}</h2>
            <p>${TEXT.thankYouBodyEs}</p>
          </div>
        </div>
      `;
    }

    if (this.submitted === 2) {
      return html`
        <div class="valvoline-at-autozone-fast-track-sweepstakes">
          <div class="thank-you">
            <h2>${TEXT.errorTitle}</h2>
            <p>${this.#submitError}</p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="valvoline-at-autozone-fast-track-sweepstakes">
        <div
          class="valvoline-at-autozone-fast-track-sweepstakes__loader"
          style="display: ${this.loader ? "flex" : "none"}"
        >
          <span class="valvoline-at-autozone-fast-track-sweepstakes__spinner"></span>
        </div>
        ${this.#renderForm()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "valvoline-at-autozone-fast-track-sweepstakes": ValvolineAtAutozoneFastTrackSweepstakes;
  }
}
