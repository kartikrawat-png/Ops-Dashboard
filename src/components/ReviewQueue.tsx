"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Shipping timeline types (mirrors src/lib/calculateShippingTimeline.ts) ───

type TimelineResult =
  | { status: "ready"; label: "Ready to Ship" }
  | { status: "pending"; tentativeDate: string; maxLeadDays: number; outOfStockSkus: string[] }
  | { status: "error"; message: string };

// ─── Types ────────────────────────────────────────────────────────────────────

type POStatus = "pending" | "approved" | "rejected" | "edit_required";

interface POItem {
  id: string;
  sku_name: string;
  units_ordered: number;
}

interface PurchaseOrder {
  id: string;
  poid: string;
  date_created: string;
  status: POStatus;
  total_revenue: number;
  raw_file_url: string | null;
  comments: string | null;
  items: POItem[];
}

type ActionStatus =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<POStatus, string> = {
  pending:       "bg-amber-100 text-amber-800 ring-amber-200",
  approved:      "bg-emerald-100 text-emerald-800 ring-emerald-200",
  rejected:      "bg-red-100 text-red-800 ring-red-200",
  edit_required: "bg-sky-100 text-sky-800 ring-sky-200",
};

const STATUS_LABELS: Record<POStatus, string> = {
  pending:       "Pending",
  approved:      "Approved",
  rejected:      "Rejected",
  edit_required: "Edit Required",
};

function StatusBadge({ status }: { status: POStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Expanded row — SKU line items ────────────────────────────────────────────

function ItemsTable({ items }: { items: POItem[] }) {
  if (items.length === 0) return <p className="text-xs text-zinc-400 italic">No line items.</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-zinc-400 uppercase tracking-wide">
          <th className="pb-1 pr-4 font-medium">SKU</th>
          <th className="pb-1 font-medium text-right">Units</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="py-1 pr-4 text-zinc-700 font-mono">{item.sku_name}</td>
            <td className="py-1 text-right text-zinc-600">{item.units_ordered.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Shipping timeline cell (approved rows only) ──────────────────────────────

/**
 * Lazily fetches the shipping timeline for a single approved PO.
 * Results are cached in a module-level Map so navigating filters
 * doesn't trigger redundant network calls.
 */
const timelineCache = new Map<string, TimelineResult>();

function ShippingTimelineCell({ poId }: { poId: string }) {
  const cached = timelineCache.get(poId);
  const [result, setResult] = useState<TimelineResult | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;                          // already have it
    let cancelled = false;

    fetch(`/api/po/${poId}/shipping-timeline`)
      .then((r) => r.json())
      .then((data: TimelineResult) => {
        if (cancelled) return;
        timelineCache.set(poId, data);
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        const err: TimelineResult = { status: "error", message: "Failed to load" };
        setResult(err);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [poId, cached]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <SpinnerIcon />
        Calculating…
      </span>
    );
  }

  if (!result || result.status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-400 italic">
        —
      </span>
    );
  }

  if (result.status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700">
        <TruckIcon />
        Ready to Ship
      </span>
    );
  }

  // status === "pending"
  const dateLabel = new Date(result.tentativeDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <span
      title={`Out of stock: ${result.outOfStockSkus.join(", ")}`}
      className="inline-flex flex-col gap-0.5"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700">
        <ClockIcon />
        {dateLabel}
      </span>
      <span className="pl-1 text-[10px] text-zinc-400 leading-tight">
        {result.maxLeadDays}d lead · {result.outOfStockSkus.length} SKU{result.outOfStockSkus.length !== 1 ? "s" : ""} short
      </span>
    </span>
  );
}

// ─── Per-row action panel ─────────────────────────────────────────────────────

interface ActionPanelProps {
  po: PurchaseOrder;
  onUpdated: (updated: PurchaseOrder) => void;
}

function ActionPanel({ po, onUpdated }: ActionPanelProps) {
  const [comments, setComments] = useState(po.comments ?? "");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>({ type: "idle" });
  const commentsRef = useRef<HTMLTextAreaElement>(null);
  const isFinalized = po.status === "approved" || po.status === "rejected";

  const submit = useCallback(
    async (newStatus: "approved" | "rejected" | "edit_required") => {
      if (newStatus === "edit_required" && !commentsOpen) {
        setCommentsOpen(true);
        setTimeout(() => commentsRef.current?.focus(), 50);
        return;
      }

      setActionStatus({ type: "submitting" });
      try {
        const res = await fetch("/api/po/update-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: po.id,
            status: newStatus,
            comments: newStatus === "edit_required" ? comments : undefined,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const msg =
            json?.fieldErrors?.comments?.[0] ??
            json?.error ??
            "Something went wrong.";
          setActionStatus({ type: "error", message: msg });
          return;
        }

        setActionStatus({
          type: "success",
          message: `Marked as ${STATUS_LABELS[newStatus]}.`,
        });
        setCommentsOpen(false);
        onUpdated(json.order as PurchaseOrder);
      } catch {
        setActionStatus({ type: "error", message: "Network error. Please retry." });
      }
    },
    [po.id, comments, commentsOpen, onUpdated]
  );

  if (isFinalized) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={po.status} />
        {po.comments && (
          <span className="text-xs text-zinc-500 italic truncate max-w-xs">
            "{po.comments}"
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => submit("approved")}
          disabled={actionStatus.type === "submitting"}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckIcon />
          Approve
        </button>

        <button
          onClick={() => submit("rejected")}
          disabled={actionStatus.type === "submitting"}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <XIcon />
          Reject
        </button>

        <button
          onClick={() => submit("edit_required")}
          disabled={actionStatus.type === "submitting"}
          className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <EditIcon />
          Edit Required
        </button>
      </div>

      {/* Comments textarea — slides in when 'Edit Required' is clicked */}
      {commentsOpen && (
        <div className="space-y-1.5">
          <textarea
            ref={commentsRef}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Describe what needs to be corrected…"
            rows={3}
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <button
              onClick={() => submit("edit_required")}
              disabled={actionStatus.type === "submitting" || !comments.trim()}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {actionStatus.type === "submitting" ? "Saving…" : "Confirm"}
            </button>
            <button
              onClick={() => { setCommentsOpen(false); setActionStatus({ type: "idle" }); }}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors dark:bg-zinc-700 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline feedback */}
      {actionStatus.type === "error" && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <XCircleIcon /> {actionStatus.message}
        </p>
      )}
      {actionStatus.type === "success" && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircleIcon /> {actionStatus.message}
        </p>
      )}
    </div>
  );
}

// ─── Main ReviewQueue component ───────────────────────────────────────────────

export default function ReviewQueue() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<POStatus | "all">("all");

  useEffect(() => {
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then((data: PurchaseOrder[]) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load purchase orders.");
        setLoading(false);
      });
  }, []);

  const handleUpdated = useCallback((updated: PurchaseOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
  }, []);

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  // Show the timeline column only when at least one approved row is visible
  const showTimeline = filtered.some((o) => o.status === "approved");

  const counts = orders.reduce<Record<POStatus | "all", number>>(
    (acc, o) => {
      acc.all++;
      acc[o.status]++;
      return acc;
    },
    { all: 0, pending: 0, approved: 0, rejected: 0, edit_required: 0 }
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Review Queue
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Approve, reject, or flag purchase orders for correction.
        </p>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-700">
        {(["all", "pending", "approved", "rejected", "edit_required"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none dark:bg-black/20">
                {counts[s]}
              </span>
            </button>
          )
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="flex items-center gap-3 py-16 justify-center text-zinc-400">
          <SpinnerIcon />
          <span>Loading orders…</span>
        </div>
      )}

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-zinc-400">
          No orders match this filter.
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                {[
                  "PO ID",
                  "Date",
                  "Revenue",
                  "Items",
                  "Status",
                  ...(showTimeline ? ["Tentative Timeline"] : []),
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((po) => (
                <>
                  <tr
                    key={po.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {/* PO ID — expand toggle + link to detail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setExpandedId((prev) => (prev === po.id ? null : po.id))
                          }
                          className="text-zinc-400 hover:text-zinc-600 transition-colors"
                          aria-label="Expand row"
                        >
                          <ChevronIcon expanded={expandedId === po.id} />
                        </button>
                        <Link
                          href={`/po/${po.id}`}
                          className="font-mono text-sm font-semibold text-zinc-900 hover:text-sky-600 dark:text-zinc-100 dark:hover:text-sky-400 transition-colors underline-offset-2 hover:underline"
                        >
                          {po.poid}
                        </Link>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(po.date_created).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(po.total_revenue)}
                    </td>

                    {/* Item count */}
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {po.items.length} SKU{po.items.length !== 1 ? "s" : ""}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={po.status} />
                    </td>

                    {/* Tentative Timeline — approved rows only */}
                    {showTimeline && (
                      <td className="px-4 py-3">
                        {po.status === "approved" ? (
                          <ShippingTimelineCell poId={po.id} />
                        ) : (
                          <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                        )}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <ActionPanel po={po} onUpdated={handleUpdated} />
                    </td>
                  </tr>

                  {/* Expanded SKU detail row */}
                  {expandedId === po.id && (
                    <tr
                      key={`${po.id}-expanded`}
                      className="bg-zinc-50/80 dark:bg-zinc-800/40"
                    >
                      <td colSpan={showTimeline ? 7 : 6} className="px-8 py-3">
                        <div className="max-w-sm">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Line Items
                          </p>
                          <ItemsTable items={po.items} />
                          {po.comments && (
                            <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              <span className="font-semibold">Comments: </span>
                              {po.comments}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Micro icons (inline SVG — no icon lib dependency) ────────────────────────

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
