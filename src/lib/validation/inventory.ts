import { z } from "zod";
import { toMinorUnit } from "@/lib/utils/currency";
import type { UnitType } from "@/types";

// The raw form data schema
export const inventoryFormSchema = z.object({
  sku: z.string().min(1, { message: "SKU is required" }),
  name: z.string().min(2, { message: "Product name must be at least 2 characters" }),
  categoryId: z.string().min(1, { message: "Category is required" }),
  unit: z.enum(["pcs", "kg", "g", "box", "pack", "liter", "other"] as [UnitType, ...UnitType[]]),
  
  // We use string/number interchangeably from inputs, but we want to coerce to number
  quantity: z.coerce.number().min(0, { message: "Quantity cannot be negative" }),
  reorderLevel: z.coerce.number().min(0, { message: "Reorder level must be >= 0" }),
  
  // Price inputs (decimals) will be coerced to minor units later
  costPriceDecimal: z.coerce.number().min(0, { message: "Cost price cannot be negative" }),
  retailPriceDecimal: z.coerce.number().min(0, { message: "Retail price cannot be negative" }),
});

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;

/**
 * Transforms the UI form data (with decimal prices) into the backend payload
 * format (with minor unit prices).
 */
export function transformToServicePayload(data: InventoryFormData) {
  return {
    sku: data.sku,
    name: data.name,
    categoryId: data.categoryId,
    unit: data.unit,
    quantity: data.quantity,
    reorderLevel: data.reorderLevel,
    costPriceMinor: toMinorUnit(data.costPriceDecimal),
    retailPriceMinor: toMinorUnit(data.retailPriceDecimal),
  };
}

export type InventoryServicePayload = ReturnType<typeof transformToServicePayload>;
