import { LitElement, html, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { injectStyles } from "../../lib/inject-styles";
import styles from "./counter.scss?inline";
// Component-local image. Vite inlines it as a base64 data URL — the asset
// travels inside the JS bundle, no extra fetches required.
import iconUrl from "./icon.svg";

injectStyles("debrain-counter", styles);

@customElement("debrain-counter")
export class DebrainCounter extends LitElement {
  @property({ type: Number, reflect: true })
  count = 0;

  @property({ type: String })
  label = "Counter";

  // Render in light DOM — without shadow DOM, styles live in <head>.
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override render(): TemplateResult {
    return html`
      <div class="debrain-counter">
        <img class="debrain-counter__icon" src=${iconUrl} alt="" aria-hidden="true" />
        <span class="debrain-counter__label">${this.label}:</span>
        <span class="debrain-counter__value">${this.count}</span>
        <button
          class="debrain-counter__btn"
          type="button"
          @click=${this.#increment}
          aria-label="Increment"
        >
          +1
        </button>
      </div>
    `;
  }

  #increment = (): void => {
    this.count += 1;
    this.dispatchEvent(
      new CustomEvent("debrain-counter:change", {
        detail: { count: this.count },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "debrain-counter": DebrainCounter;
  }
}
