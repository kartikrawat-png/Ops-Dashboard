import { z } from "zod";

/**
 * Zod schema that mirrors the PurchaseOrders + POItems Prisma model.
 * Used to validate Claude's JSON extraction before persisting.
 */
export const POItemExtractionSchema = z.object({
  sku_name: z.string().min(1, "SKU name is required"),
  units_ordered: z
    .number()
    .int("Units must be a whole number")
    .positive("Units must be positive"),
});

export const POExtractionSchema = z.object({
  poid: z.string().min(1, "PO ID is required"),
  date: z.string().min(1, "Date is required"),
  total_revenue: z
    .number()
    .nonnegative("Revenue cannot be negative"),
  items: z
    .array(POItemExtractionSchema)
    .min(1, "At least one SKU line item is required"),
});

export type POExtraction = z.infer<typeof POExtractionSchema>;
export type POItemExtraction = z.infer<typeof POItemExtractionSchema>;
