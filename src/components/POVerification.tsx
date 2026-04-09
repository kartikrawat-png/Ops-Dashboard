"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type POStatus = "pending" | "approved" | "rejected" | "edit_required";

interface POItem {
  id: string;
  sku_name: string;
  units_ordered: number;
}

interface SerializedPO {
  id: string;
  poid: string;
  date_created: string;
  status: POStatus;
  total_revenue: number;
  raw_file_url: string | null;
  comments: string | null;
  items: POItem[];
}

type ActionState =
  | { type: "idle" }
  | { type: "submitting"; action: "approved" | "rejected" }
  | { type: "success"; action: "approved" | "rejected" }
  | { type: "error"; message: string };

// ─── Document mock panel ──────────────────────────────────────────────────────

function DocumentPreview({ po }: { po: SerializedPO }) {
  const dateFormatted = new Date(po.date_created).toISOString().split("T")[0];

  return (
    <div className="bg-surface-container-low flex-1 min-h-[600px] relative overflow-hidden flex items-center justify-center">
      {/* Technical dot-grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#2d2f2f 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Paper document */}
      <div className="relative w-[90%] h-[90%] bg-white shadow-2xl p-10 flex flex-col gap-6 text-[10px] text-black font-mono leading-tight overflow-auto">

        {/* Header */}
        <div className="flex justify-between border-b-2 border-black pb-4">
          <div>
            <p className="font-bold text-base">PURCHASE ORDER</p>
            <p className="text-[9px] mt-1 text-gray-500 uppercase tracking-wider">
              Auto-extracted document
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black">{po.poid}</p>
            <p className="text-[9px] mt-1">DATE: {dateFormatted}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="flex-1">
          <div className="grid grid-cols-5 font-bold border-b-2 border-black pb-1 mb-2 uppercase text-[9px] tracking-wide">
            <div className="col-span-2">SKU</div>
            <div className="col-span-2">Description</div>
            <div className="text-right">Units</div>
          </div>
          <div className="space-y-1.5">
            {po.items.length === 0 ? (
              <p className="text-gray-400 italic py-4 text-center">No line items extracted</p>
            ) : (
              po.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-5 border-b border-gray-100 pb-1.5"
                >
                  <div className="col-span-2 font-bold">{item.sku_name}</div>
                  <div className="col-span-2 text-gray-500">—</div>
                  <div className="text-right">{item.units_ordered}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end gap-8 border-t-2 border-black pt-4">
          <div className="text-right text-[9px] uppercase tracking-wide space-y-1">
            <p className="font-bold">Total Amount</p>
          </div>
          <div className="text-right space-y-1">
            <p className="font-extrabold text-sm">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(po.total_revenue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confidence chip ──────────────────────────────────────────────────────────

function VerifiedChip() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-inverse-surface px-1.5 py-0.5 text-[8px] text-inverse-primary font-bold uppercase tracking-wider">
      AI Extracted
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function POVerification({ po }: { po: SerializedPO }) {
  const router = useRouter();
  const [actionState, setActionState] = useState<ActionState>({ type: "idle" });

  const isFinalized = po.status === "approved" || po.status === "rejected";
  const isSubmitting = actionState.type === "submitting";

  const dateFormatted = new Date(po.date_created).toISOString().split("T")[0];

  async function handleAction(action: "approved" | "rejected") {
    setActionState({ type: "submitting", action });
    try {
      const res = await fetch("/api/po/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: po.id, status: action }),
      });
      if (!res.ok) {
        const json = await res.json();
        setActionState({ type: "error", message: json?.error ?? "Request failed." });
        return;
      }
      setActionState({ type: "success", action });
      // Navigate back to the review queue after a brief pause
      setTimeout(() => router.push("/"), 900);
    } catch {
      setActionState({ type: "error", message: "Network error — please retry." });
    }
  }

  // ── Success overlay ──
  if (actionState.type === "success") {
    const approved = actionState.action === "approved";
    return (
      <div className="col-span-12 flex flex-col items-center justify-center py-32 gap-6">
        <div
          className={`w-16 h-16 flex items-center justify-center ${
            approved ? "bg-primary-fixed" : "bg-surface-container-highest"
          }`}
        >
          <span className="material-symbols-outlined text-[36px] text-on-surface">
            {approved ? "check_circle" : "cancel"}
          </span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter font-headline">
            {approved ? "Order Approved" : "Order Rejected"}
          </h2>
          <p className="text-sm text-on-surface-variant mt-2">
            Returning to review queue…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Left panel: Document Preview ── */}
      <section className="col-span-12 lg:col-span-5 flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <h2 className="text-2xl font-black uppercase tracking-tighter font-headline">
            Source Document
          </h2>
          <div className="flex gap-2">
            {[
              { icon: "zoom_in", label: "Zoom in" },
              { icon: "zoom_out", label: "Zoom out" },
              { icon: "print",   label: "Print"   },
            ].map(({ icon, label }) => (
              <button
                key={icon}
                aria-label={label}
                className="p-2 bg-surface-container-highest hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        {po.raw_file_url ? (
          <iframe
            src={po.raw_file_url}
            className="flex-1 min-h-[600px] w-full border-0"
            title="PO Document"
          />
        ) : (
          <DocumentPreview po={po} />
        )}
      </section>

      {/* ── Right panel: Verification Form ── */}
      <section className="col-span-12 lg:col-span-7 flex flex-col gap-8">

        {/* Auto-extracted fields */}
        <div className="bg-surface-container-low p-8">
          <div className="flex items-center gap-3 mb-6">
            <span
              className="material-symbols-outlined text-primary-fixed text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <h3 className="text-sm font-bold uppercase tracking-widest font-label text-on-surface">
              Auto-Extracted Data
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {/* PO Number */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label">
                PO Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue={po.poid}
                  readOnly={isFinalized}
                  className="w-full bg-surface-container-highest border-none focus:ring-0 focus:outline-none focus:border-b-2 focus:border-primary-fixed text-on-surface font-bold py-3 px-4 pr-28 transition-all text-sm"
                />
                <VerifiedChip />
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label">
                Date
              </label>
              <input
                type="text"
                defaultValue={dateFormatted}
                readOnly={isFinalized}
                className="w-full bg-surface-container-highest border-none focus:ring-0 focus:outline-none focus:border-b-2 focus:border-primary-fixed text-on-surface font-bold py-3 px-4 transition-all text-sm"
              />
            </div>

            {/* Revenue */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label">
                Total Revenue
              </label>
              <div className="relative">
                <input
                  type="text"
                  defaultValue={new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(po.total_revenue)}
                  readOnly={isFinalized}
                  className="w-full bg-surface-container-highest border-none focus:ring-0 focus:outline-none focus:border-b-2 focus:border-primary-fixed text-on-surface font-bold py-3 px-4 pr-10 transition-all text-sm"
                />
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
            </div>

            {/* Comments (if edit_required) */}
            {po.comments && (
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider font-label">
                  Review Comments
                </label>
                <div className="bg-surface-container border-l-4 border-primary-fixed px-4 py-3 text-sm text-on-surface">
                  {po.comments}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line item validation table */}
        <div className="flex-1 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-widest font-label px-1">
            Line Item Validation
          </h3>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container font-label uppercase text-[10px] tracking-[0.2em] text-on-surface-variant">
                  <th className="py-4 px-6">SKU</th>
                  <th className="py-4 px-6 text-right">Units Ordered</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {po.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-8 px-6 text-center text-on-surface-variant text-xs italic"
                    >
                      No line items found.
                    </td>
                  </tr>
                ) : (
                  po.items.map((item) => (
                    <tr
                      key={item.id}
                      className="bg-surface-container-low hover:bg-surface-container-highest transition-colors"
                    >
                      <td className="py-4 px-6 border-b border-surface-container font-mono text-sm">
                        {item.sku_name}
                      </td>
                      <td className="py-4 px-6 border-b border-surface-container text-right font-bold">
                        {item.units_ordered.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total + actions */}
          <div className="mt-auto pt-8 border-t border-surface-container flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">
                Total Calculation
              </span>
              <span className="text-4xl font-black text-on-surface tracking-tighter font-headline">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(po.total_revenue)}
              </span>
            </div>

            {isFinalized ? (
              <div className="flex items-center gap-3">
                <span
                  className={`px-6 py-3 font-black uppercase tracking-widest text-xs font-label ${
                    po.status === "approved"
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : "bg-surface-container-highest text-on-surface"
                  }`}
                >
                  {po.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                </span>
              </div>
            ) : (
              <div className="flex gap-4 w-full md:w-auto">
                {/* Error message */}
                {actionState.type === "error" && (
                  <p className="text-xs text-error self-center">
                    {actionState.message}
                  </p>
                )}

                <button
                  onClick={() => handleAction("rejected")}
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-8 py-4 bg-surface-container-highest text-on-surface font-bold uppercase tracking-widest text-xs hover:bg-outline-variant/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-label"
                >
                  {isSubmitting && actionState.action === "rejected"
                    ? "Rejecting…"
                    : "Reject Case"}
                </button>

                <button
                  onClick={() => handleAction("approved")}
                  disabled={isSubmitting}
                  className="flex-1 md:flex-none px-12 py-4 bg-primary-fixed text-on-primary-fixed font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:brightness-110 active:opacity-80 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-label"
                >
                  {isSubmitting && actionState.action === "approved"
                    ? "Submitting…"
                    : "Approve & Submit"}
                  {!(isSubmitting && actionState.action === "approved") && (
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_right
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
