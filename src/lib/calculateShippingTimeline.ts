import { prisma } from "@/lib/prisma";

// ─── Return types ─────────────────────────────────────────────────────────────

/** All SKUs are available in inventory at required quantities. */
export interface TimelineReady {
  status: "ready";
  label: "Ready to Ship";
}

/**
 * One or more SKUs are out of stock.
 * `tentativeDate` is today + the longest lead time across all missing SKUs.
 */
export interface TimelinePending {
  status: "pending";
  tentativeDate: Date;
  /** Days until the last item is back in stock. */
  maxLeadDays: number;
  /** SKU names that are currently out of stock. */
  outOfStockSkus: string[];
}

/** PO not found, or an unexpected error occurred. */
export interface TimelineError {
  status: "error";
  message: string;
}

export type ShippingTimeline = TimelineReady | TimelinePending | TimelineError;

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Calculates the shipping timeline for a given Purchase Order.
 *
 * Logic:
 *  1. Load all POItems for the PO.
 *  2. For each SKU, look up the matching Inventory row.
 *  3. A SKU is considered "out of stock" when its inventory row is missing
 *     OR when stock_level === 0.
 *  4. If all SKUs are in stock → return { status: "ready" }.
 *  5. Otherwise → return the tentative ship date as today + max(lead_time_days)
 *     across all out-of-stock SKUs.
 *     - If the inventory row is missing entirely, lead_time_days defaults to 0
 *       so we still flag the SKU while avoiding a hard crash.
 */
export async function calculateShippingTimeline(
  poId: string
): Promise<ShippingTimeline> {
  // ── 1. Load PO items ──────────────────────────────────────────
  const poItems = await prisma.pOItem.findMany({
    where: { po_id: poId },
    select: { sku_name: true },
  });

  if (poItems.length === 0) {
    return {
      status: "error",
      message: `No items found for PO '${poId}'.`,
    };
  }

  // ── 2. Load inventory for every SKU in one query ──────────────
  const skuNames = poItems.map((i) => i.sku_name);

  const inventoryRows = await prisma.inventory.findMany({
    where: { sku_name: { in: skuNames } },
    select: { sku_name: true, stock_level: true, lead_time_days: true },
  });

  // Build a lookup map: sku_name → inventory row
  const inventoryMap = new Map(inventoryRows.map((r) => [r.sku_name, r]));

  // ── 3. Partition SKUs into in-stock / out-of-stock ────────────
  const outOfStock: Array<{ sku_name: string; lead_time_days: number }> = [];

  for (const { sku_name } of poItems) {
    const inv = inventoryMap.get(sku_name);
    const inStock = inv !== undefined && inv.stock_level > 0;

    if (!inStock) {
      outOfStock.push({
        sku_name,
        lead_time_days: inv?.lead_time_days ?? 0,
      });
    }
  }

  // ── 4. All SKUs in stock → ready ──────────────────────────────
  if (outOfStock.length === 0) {
    return { status: "ready", label: "Ready to Ship" };
  }

  // ── 5. Derive tentative date from longest lead time ───────────
  const maxLeadDays = Math.max(...outOfStock.map((s) => s.lead_time_days));

  const tentativeDate = new Date();
  tentativeDate.setHours(0, 0, 0, 0);             // normalise to midnight
  tentativeDate.setDate(tentativeDate.getDate() + maxLeadDays);

  return {
    status: "pending",
    tentativeDate,
    maxLeadDays,
    outOfStockSkus: outOfStock.map((s) => s.sku_name),
  };
}
