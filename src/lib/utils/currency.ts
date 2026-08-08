/**
 * Converts a decimal string or number (e.g., 150.50) into an integer minor unit (e.g., 15050).
 * Handles floating-point quirks by using Math.round after multiplication.
 */
export function toMinorUnit(amount: string | number): number {
  if (amount === undefined || amount === null || amount === "") return 0;
  
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;

  // Multiply by 100 to get minor units (e.g. paisa for PKR, cents for USD)
  return Math.round(num * 100);
}

/**
 * Converts a minor unit integer (e.g., 15050) back into a decimal number (150.50).
 */
export function fromMinorUnit(minorUnit: number): number {
  if (!minorUnit || isNaN(minorUnit)) return 0;
  return minorUnit / 100;
}

/**
 * Formats a minor unit integer into a localized currency string.
 */
export function formatCurrency(minorUnit: number, currencyCode: string = "PKR"): string {
  const decimal = fromMinorUnit(minorUnit);
  
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimal);
}
