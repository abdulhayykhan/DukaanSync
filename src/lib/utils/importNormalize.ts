/**
 * Shared utility for flexible CSV/Excel header normalization during bulk import.
 *
 * Strips all non-alpha characters (spaces, underscores, dashes, parentheses, slashes)
 * and lowercases the result so header "Customer Name", "customer_name", "CUSTOMERNAME"
 * all resolve to the same key "customername".
 */

/** Normalize a raw header key from a spreadsheet row into a canonical lookup key */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Build a normalized lookup map from a raw spreadsheet row */
export function buildNormalizedRow(
  row: Record<string, string | number | boolean | null>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normalized[normalizeKey(k)] = v;
  }
  return normalized;
}

/**
 * Try a list of alias keys (already normalized) against the normalized row map.
 * Returns the first non-empty value found, or undefined.
 */
export function getField(
  normalized: Record<string, unknown>,
  aliases: string[]
): unknown {
  for (const alias of aliases) {
    const val = normalized[alias];
    if (val !== undefined && val !== "" && val !== null) return val;
  }
  return undefined;
}
