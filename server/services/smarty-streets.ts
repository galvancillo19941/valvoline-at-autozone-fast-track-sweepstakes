import SmartySDK from "smartystreets-javascript-sdk";

const SmartyCore = SmartySDK.core;
const InternationalLookup = SmartySDK.internationalAddressAutocomplete.Lookup;
const USLookup = SmartySDK.usAutocompletePro.Lookup;

type InternationalClient = ReturnType<
  InstanceType<typeof SmartyCore.ClientBuilder>["buildInternationalAddressAutocompleteClient"]
>;
type USClient = ReturnType<
  InstanceType<typeof SmartyCore.ClientBuilder>["buildUsAutocompleteProClient"]
>;

export interface AddressSuggestion {
  addressText: string | null;
  addressId: string | null;
  entries: number;
  street: string | null;
  locality: string | null;
  administrativeArea: string | null;
  postalCode: string | null;
  countryIso3: string | null;
}

export interface USAddressSuggestion {
  addressText: string | null;
  street: string | null;
  secondary: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  entries: number;
}

export interface DetailedAddress {
  street: string;
  locality: string;
  administrativeArea: string;
  postalCode: string;
  countryIso3: string;
}

export interface AutocompleteResult {
  suggestions: (AddressSuggestion | USAddressSuggestion)[];
  topResult: DetailedAddress | USAddressSuggestion | null;
}

export interface USSearchParams {
  search: string;
  maxResults?: number;
  selected?: string;
  includeOnlyCities?: string;
  preferStates?: string;
  preferRatio?: number;
  source?: string;
}

// US Autocomplete Pro and International Autocomplete are separate licenses on
// the same credentials, so each needs its own client. Both are built once and
// reused — a ClientBuilder holds no per-request state.
let internationalClient: InternationalClient | undefined;
let usClient: USClient | undefined;

// Referer sent alongside a website key. Smarty authorizes those keys by host,
// and from here the host is always ours — so the key needs this one domain
// allow-listed, never the consumer pages the embed lands on.
const DEFAULT_WEBSITE_HOST = "localhost";

type Credentials =
  | InstanceType<typeof SmartyCore.StaticCredentials>
  | InstanceType<typeof SmartyCore.SharedCredentials>;

function credentials(): Credentials {
  // Preferred: the secret auth-id/auth-token pair ("Secret Keys" in Smarty's
  // dashboard). Not host-restricted, so it works from anywhere.
  const authId = process.env.SMARTY_AUTH_ID;
  const authToken = process.env.SMARTY_AUTH_TOKEN;
  if (authId && authToken) {
    return new SmartyCore.StaticCredentials(authId, authToken);
  }

  // Fallback: an 18-digit website/embedded key ("Website Keys"), signed with
  // the Referer above.
  const websiteKey = process.env.SMARTY_WEBSITE_KEY;
  if (websiteKey) {
    return new SmartyCore.SharedCredentials(
      websiteKey,
      process.env.SMARTY_WEBSITE_HOST ?? DEFAULT_WEBSITE_HOST,
    );
  }

  throw new Error(
    "Set SMARTY_AUTH_ID + SMARTY_AUTH_TOKEN (secret pair), or SMARTY_WEBSITE_KEY (website key), in the environment",
  );
}

function getInternationalClient(): InternationalClient {
  internationalClient ??= new SmartyCore.ClientBuilder(credentials())
    .withLicenses(["international-autocomplete-v2-cloud"])
    .buildInternationalAddressAutocompleteClient();
  return internationalClient;
}

function getUSClient(): USClient {
  usClient ??= new SmartyCore.ClientBuilder(credentials())
    .withLicenses(["us-autocomplete-pro-cloud"])
    .buildUsAutocompleteProClient();
  return usClient;
}

// USA goes through US Autocomplete Pro (richer: secondaries, city/state/zip
// split out); everything else through International Autocomplete, which only
// returns a single addressText plus an addressId to expand later.
const SUPPORTED_COUNTRIES = new Set([
  "USA",
  "CAN",
  "GBR",
  "AUS",
  "NZL",
  "FRA",
  "DEU",
  "ITA",
  "ESP",
  "NLD",
  "BEL",
  "CHE",
  "AUT",
  "DNK",
  "SWE",
  "NOR",
  "FIN",
  "IRL",
  "PRT",
  "POL",
  "CZE",
  "HUN",
  "ROU",
  "BGR",
  "HRV",
  "SVN",
  "SVK",
  "LTU",
  "LVA",
  "EST",
  "GRC",
  "CYP",
  "MLT",
  "LUX",
  "ISL",
]);

export function isSupportedCountry(countryCode: string): boolean {
  return SUPPORTED_COUNTRIES.has(countryCode.toUpperCase());
}

export function isUSACountry(countryCode: string): boolean {
  return countryCode.toUpperCase() === "USA";
}

/** Partial-address lookup against International Autocomplete. */
export async function searchAddress({
  search,
  country,
  maxResults,
}: {
  search: string;
  country: string;
  maxResults?: number;
}): Promise<AddressSuggestion[]> {
  if (!search || !country) {
    throw new Error("Both search and country parameters are required");
  }

  const lookup = new InternationalLookup({ search, country });
  if (maxResults) lookup.addCustomParameter("max_results", String(maxResults));

  const results = await getInternationalClient().send(lookup);
  return (results.result ?? []).map((suggestion) => ({
    addressText: suggestion.addressText || null,
    addressId: suggestion.addressId || null,
    entries: suggestion.entries || 0,
    street: suggestion.street || null,
    locality: suggestion.locality || null,
    administrativeArea: suggestion.administrativeArea || null,
    postalCode: suggestion.postalCode || null,
    countryIso3: suggestion.countryIso3 || null,
  }));
}

/** Expands one International suggestion (by addressId) into its components. */
export async function getAddressDetails({
  addressId,
  country,
}: {
  addressId: string;
  country: string;
}): Promise<DetailedAddress | null> {
  if (!addressId || !country) {
    throw new Error("Both addressId and country parameters are required");
  }

  const lookup = new InternationalLookup({ addressId, country });
  const results = await getInternationalClient().send(lookup);
  const address = results.result?.[0];
  if (!address) return null;

  return {
    street: address.street || "",
    locality: address.locality || "",
    administrativeArea: address.administrativeArea || "",
    postalCode: address.postalCode || "",
    countryIso3: address.countryIso3 || "",
  };
}

/** Partial-address lookup against US Autocomplete Pro. */
export async function searchUSAddress({
  search,
  maxResults,
  selected,
  includeOnlyCities,
  preferStates,
  preferRatio,
  source,
}: USSearchParams): Promise<USAddressSuggestion[]> {
  if (!search) {
    throw new Error("Search parameter is required");
  }

  const lookup = new USLookup(search);
  if (maxResults) lookup.maxResults = maxResults;
  // "selected" re-runs the lookup for an address the user already picked, so
  // Smarty returns its apartment/suite entries instead of the street again.
  if (selected) lookup.selected = selected;
  if (source) lookup.source = source;
  if (includeOnlyCities) {
    // "Chicago,IL;Seattle,WA" → ["Chicago,IL", "Seattle,WA"]
    lookup.includeOnlyCities = includeOnlyCities.split(";").map((city) => city.trim());
  }
  if (preferStates) {
    lookup.preferStates = preferStates.split(",").map((state) => state.trim());
  }
  if (preferRatio !== undefined) lookup.preferRatio = preferRatio;

  const results = await getUSClient().send(lookup);
  return (results.result ?? []).map((suggestion) => ({
    addressText: suggestion.streetLine || null,
    street: suggestion.streetLine || null,
    secondary: suggestion.secondary || null,
    city: suggestion.city || null,
    state: suggestion.state || null,
    zipcode: suggestion.zipcode || null,
    entries: suggestion.entries || 0,
  }));
}

/**
 * Single entry point for the controller: routes to US Autocomplete Pro or
 * International Autocomplete based on the country, and normalizes both into
 * { suggestions, topResult }. US-only params are ignored for other countries.
 */
export async function unifiedAutocomplete({
  search,
  country,
  maxResults = 5,
  selected,
  includeOnlyCities,
  preferStates,
  preferRatio,
  source,
}: USSearchParams & { country: string }): Promise<AutocompleteResult> {
  if (!search || !country) {
    throw new Error("Both search and country parameters are required");
  }

  if (isUSACountry(country)) {
    const suggestions = await searchUSAddress({
      search,
      maxResults,
      selected,
      includeOnlyCities,
      preferStates,
      preferRatio,
      source,
    });
    return { suggestions, topResult: suggestions[0] ?? null };
  }

  const suggestions = await searchAddress({ search, country, maxResults });
  const topResult = suggestions[0]?.addressId
    ? await getAddressDetails({ addressId: suggestions[0].addressId, country })
    : null;
  return { suggestions, topResult };
}
