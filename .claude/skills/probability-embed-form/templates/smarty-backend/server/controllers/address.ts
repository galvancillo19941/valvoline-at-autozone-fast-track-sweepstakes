import type { Request, Response } from "express";
import {
  getAddressDetails,
  isSupportedCountry,
  searchAddress,
  unifiedAutocomplete,
} from "../services/smarty-streets.js";

// Smarty bills per lookup, so the endpoint refuses anything too short to
// produce a useful suggestion and caps how many results a caller can ask for.
const MIN_SEARCH_LENGTH = 3;
const MAX_RESULTS_LIMIT = 10;
const DEFAULT_MAX_RESULTS = 5;

function readMaxResults(raw: unknown): number {
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MAX_RESULTS;
  return Math.min(parsed, MAX_RESULTS_LIMIT);
}

function readString(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

// The credentials live only in this process — never leak the SDK's own error
// text (which can echo the request URL, auth-id included) to the caller.
function fail(res: Response, error: unknown, message: string): Response {
  console.error(`${message}:`, error);
  return res.status(500).json({ success: false, error: message });
}

/** GET /api/address/search?q=123+Main&country=USA&maxResults=5 */
export async function search(req: Request, res: Response): Promise<Response> {
  const q = readString(req.query.q);
  const country = readString(req.query.country);

  if (!q || !country) {
    return res.status(400).json({
      success: false,
      error: "The q (query) and country parameters are required",
    });
  }
  if (q.length < MIN_SEARCH_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `The search must be at least ${MIN_SEARCH_LENGTH} characters`,
    });
  }
  if (!isSupportedCountry(country)) {
    return res.status(400).json({
      success: false,
      error: `The country ${country} is not supported`,
      hint: "Use 3-letter ISO codes such as USA, CAN, MEX, GBR",
    });
  }

  try {
    const suggestions = await searchAddress({
      search: q,
      country: country.toUpperCase(),
      maxResults: readMaxResults(req.query.maxResults),
    });
    return res.json({
      success: true,
      query: q,
      country: country.toUpperCase(),
      totalResults: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    return fail(res, error, "Failed to search addresses");
  }
}

/** GET /api/address/details?addressId=abc123&country=CAN */
export async function details(req: Request, res: Response): Promise<Response> {
  const addressId = readString(req.query.addressId);
  const country = readString(req.query.country);

  if (!addressId || !country) {
    return res.status(400).json({
      success: false,
      error: "The addressId and country parameters are required",
    });
  }

  try {
    const address = await getAddressDetails({ addressId, country: country.toUpperCase() });
    if (!address) {
      return res.status(404).json({ success: false, error: "Address not found" });
    }
    return res.json({ success: true, data: address });
  } catch (error) {
    return fail(res, error, "Failed to fetch address details");
  }
}

/**
 * GET /api/address/autocomplete?q=123+Main&country=USA&maxResults=5
 *
 * What the embed's Street Address field calls on every keystroke (debounced).
 * USA-only extras — selected, includeOnlyCities, preferStates, preferRatio,
 * source — are accepted here and ignored for other countries.
 */
export async function autocomplete(req: Request, res: Response): Promise<Response> {
  const q = readString(req.query.q);
  const country = readString(req.query.country);

  if (!q || !country) {
    return res.status(400).json({
      success: false,
      error: "The q (query) and country parameters are required",
    });
  }
  if (q.length < MIN_SEARCH_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `The search must be at least ${MIN_SEARCH_LENGTH} characters`,
    });
  }
  if (!isSupportedCountry(country)) {
    return res.status(400).json({
      success: false,
      error: `The country ${country} is not supported`,
      hint: "Use 3-letter ISO codes such as USA, CAN, MEX, GBR",
    });
  }

  const preferRatioRaw = readString(req.query.preferRatio);
  const preferRatio = preferRatioRaw ? Number.parseInt(preferRatioRaw, 10) : undefined;

  try {
    const result = await unifiedAutocomplete({
      search: q,
      country: country.toUpperCase(),
      maxResults: readMaxResults(req.query.maxResults),
      selected: readString(req.query.selected),
      includeOnlyCities: readString(req.query.includeOnlyCities),
      preferStates: readString(req.query.preferStates),
      preferRatio: Number.isFinite(preferRatio) ? preferRatio : undefined,
      source: readString(req.query.source),
    });

    return res.json({
      success: true,
      query: q,
      country: country.toUpperCase(),
      totalSuggestions: result.suggestions.length,
      suggestions: result.suggestions,
      topResult: result.topResult,
    });
  } catch (error) {
    return fail(res, error, "Failed to autocomplete address");
  }
}

/** GET /api/address/validate-country?country=USA */
export function validateCountry(req: Request, res: Response): Response {
  const country = readString(req.query.country);
  if (!country) {
    return res.status(400).json({ success: false, error: "The country parameter is required" });
  }

  return res.json({
    success: true,
    country: country.toUpperCase(),
    isSupported: isSupportedCountry(country),
  });
}
