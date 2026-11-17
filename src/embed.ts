// Entry point for the embeddable bundle.
// Each import registers its custom element via @customElement.
// To add a new component, create it under src/components/<name>/ and add its import here.

import "./components/counter/counter";

export { DebrainCounter } from "./components/counter/counter";

export const version = "0.1.0";
