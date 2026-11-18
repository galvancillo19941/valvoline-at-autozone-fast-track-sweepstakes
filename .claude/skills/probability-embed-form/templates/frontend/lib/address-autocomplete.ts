import { embedOrigin } from "./embed-origin";

// Street Address autocomplete (Smarty). Lookups go through our own Express app
// (server/controllers/address.ts), never straight to Smarty: the
// auth-id/auth-token pair stays on the server, so no credential ships in this
// bundle and no consumer domain has to be pre-authorized in Smarty's dashboard.
const COUNTRY = "USA"; // this promotion is US-only; the endpoint supports more
const MIN_CHARS = 3; // the endpoint rejects anything shorter
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;

// One row of /api/address/autocomplete's "suggestions" for a USA lookup.
interface AddressSuggestion {
  street: string | null;
  secondary: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
}

// "123 Main St Apt 4, Chicago, IL 60601" — what a row reads as, and what lands
// in the field: the form has no separate City / State / ZIP inputs.
const suggestionLabel = (s: AddressSuggestion): string =>
  [
    [s.street, s.secondary].filter(Boolean).join(" "),
    s.city,
    `${s.state ?? ""} ${s.zipcode ?? ""}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

const INVALID_MESSAGE = "Please select a valid address from the suggestions";

export interface AddressAutocomplete {
  /**
   * True when the field is empty (Universal Form owns "required") or holds an
   * address picked from the list. Strict on purpose: if the lookup service is
   * unreachable nothing can be picked, so the form cannot be submitted.
   */
  isValid(): boolean;
  /** Shows the "pick an address" error under the field and focuses it. */
  showError(): void;
}

// The input belongs to Universal Form's markup, so this is wired imperatively
// instead of through a Lit template.
export function attachAddressAutocomplete(
  input: HTMLInputElement,
  apiOrigin?: string,
): AddressAutocomplete | undefined {
  const host = input.parentElement;
  if (!host) return undefined;

  const origin = (apiOrigin ?? "").replace(/\/+$/, "") || embedOrigin();
  const list = document.createElement("ul");
  list.className = "{{PREFIX}}__suggestions";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  host.appendChild(list);

  input.setAttribute("autocomplete", "off");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");

  let debounce: number | undefined;
  // The exact text a suggestion wrote into the field; typing anything else
  // makes the value differ from it and therefore invalid again.
  let pickedValue = "";

  // Universal Form's own required error is a <p class="field-required-error">
  // it renders next to the field (light DOM, outside this input's shadow root).
  // The "pick an address" message is a <p> of ours in the same place, so it
  // gets the same styling; the form never knows about it.
  const ERROR_CLASS = "{{PREFIX}}__address-error";
  const wrapper = (): HTMLElement | null =>
    ((input.getRootNode() as ShadowRoot).host as HTMLElement | undefined)?.closest(
      ".field-wrapper",
    ) ?? null;

  // Universal Form shows its green check for any non-empty value; this class
  // (see the scss) hides it while the text isn't a picked address.
  const syncCheck = (): void => {
    const value = input.value.trim();
    const invalid = value !== "" && value !== pickedValue;
    input.closest(".style-label, .field")?.classList.toggle("{{PREFIX}}__address-invalid", invalid);
  };

  const clearError = (): void => {
    wrapper()?.querySelector(`.${ERROR_CLASS}`)?.remove();
    input.removeAttribute("aria-invalid");
  };

  const render = (suggestions: AddressSuggestion[]): void => {
    list.replaceChildren(
      ...suggestions.map((suggestion) => {
        const item = document.createElement("li");
        item.className = "{{PREFIX}}__suggestion";
        item.setAttribute("role", "option");
        item.textContent = suggestionLabel(suggestion);
        // mousedown (not click) fires before the input's own blur handler, so
        // the list is still rendered when this runs.
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          input.value = item.textContent ?? "";
          pickedValue = input.value.trim();
          clearError();
          syncCheck();
          // Universal Form (and the floating label) listen for "input" — setting
          // .value alone wouldn't tell either of them the field changed.
          input.dispatchEvent(new Event("input", { bubbles: true }));
          render([]);
        });
        return item;
      }),
    );
    list.hidden = suggestions.length === 0;
    input.setAttribute("aria-expanded", String(suggestions.length > 0));
  };

  const fetchSuggestions = async (search: string): Promise<void> => {
    try {
      const url = new URL(`${origin}/api/address/autocomplete`);
      url.searchParams.set("q", search);
      url.searchParams.set("country", COUNTRY);
      url.searchParams.set("maxResults", String(MAX_RESULTS));
      const res = await fetch(url);
      // Check the status before parsing: a dev server without the API routes
      // answers 200 with the demo page's HTML, and the JSON parse error that
      // follows is indistinguishable from "no matches".
      if (!res.ok) throw new Error(`Address lookup failed with ${res.status}`);
      const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
      // A slower response for an earlier keystroke must not overwrite the list
      // for what's in the field now.
      if (input.value.trim() !== search) return;
      render(data.suggestions ?? []);
    } catch (error) {
      // Autocomplete is a convenience — a failed lookup just shows no suggestions
      // (the field stays invalid until an address is picked). Log it, though: silently showing no suggestions
      // looks exactly like a working field that found nothing.
      console.warn("[{{PREFIX}}] address autocomplete unavailable:", error);
      syncCheck();
      render([]);
    }
  };

  input.addEventListener("input", (e) => {
    // Our own dispatch after a pick must not trigger another lookup.
    if (!e.isTrusted) return;
    if (input.value.trim() !== pickedValue) pickedValue = "";
    clearError();
    syncCheck();
    const search = input.value.trim();
    window.clearTimeout(debounce);
    if (search.length < MIN_CHARS) {
      render([]);
      return;
    }
    debounce = window.setTimeout(() => void fetchSuggestions(search), DEBOUNCE_MS);
  });

  // A short delay lets a suggestion's mousedown land before the list closes
  // out from under it.
  // On leaving the field, anything typed that wasn't picked is flagged right
  // away, so it doesn't depend on the rest of the form being valid for the
  // submit-time check to run. (Focus stays where the visitor went.)
  input.addEventListener("blur", () =>
    window.setTimeout(() => {
      render([]);
      if (!api.isValid()) showError(false);
    }, 150),
  );
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !list.hidden) {
      e.stopPropagation();
      render([]);
    }
  });

  const showError = (focus: boolean): void => {
    const host = wrapper();
    if (host && !host.querySelector(`.${ERROR_CLASS}`)) {
      const el = document.createElement("p");
      el.className = `field-required-error ${ERROR_CLASS}`;
      el.setAttribute("role", "alert");
      el.textContent = INVALID_MESSAGE;
      host.append(el);
    }
    input.setAttribute("aria-invalid", "true");
    if (focus) input.focus();
  };

  const api: AddressAutocomplete = {
    isValid: () => {
      const value = input.value.trim();
      return value === "" || value === pickedValue;
    },
    showError: () => showError(true),
  };
  return api;
}
