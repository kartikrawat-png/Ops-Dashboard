"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtractedItem {
  sku_name: string;
  units_ordered: number;
}

interface ExtractionResult {
  poid: string;
  date: string;
  total_revenue: number;
  items: ExtractedItem[];
}

interface ItemRow extends ExtractedItem {
  buy_price: string; // string while user is typing
}

type Step = 1 | 2 | 3;

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Upload PDF"       },
  { n: 2, label: "Partner Details"  },
  { n: 3, label: "Review & Submit"  },
] as const;

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map(({ n, label }, i) => {
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 flex items-center justify-center text-xs font-black font-label transition-colors ${
                  done
                    ? "bg-primary-fixed text-on-primary-fixed"
                    : active
                    ? "bg-inverse-surface text-surface"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {done ? (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                ) : (
                  n
                )}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-widest font-label whitespace-nowrap ${
                  active ? "text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-16 mx-2 mb-5 transition-colors ${
                  done ? "bg-primary-fixed" : "bg-surface-container"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function UploadStep({
  onExtracted,
}: {
  onExtracted: (data: ExtractionResult, fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState<"idle" | "extracting" | "error">("idle");
  const [error, setError]       = useState<string | null>(null);

  async function processFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    setStatus("extracting");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/extract-po", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Extraction failed.");
        setStatus("error");
        return;
      }
      onExtracted(json.extraction as ExtractionResult, file.name);
    } catch {
      setError("Network error — please retry.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tighter font-headline">
          Upload Purchase Order
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Drop a PDF and Claude will extract the PO data automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed cursor-pointer transition-colors min-h-[280px] select-none ${
          dragging
            ? "border-primary-fixed bg-primary-fixed/5"
            : "border-surface-container-highest hover:border-outline hover:bg-surface-container-low"
        }`}
      >
        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#2d2f2f 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {status === "extracting" ? (
          <>
            <svg className="h-10 w-10 animate-spin text-primary-fixed" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="text-center z-10">
              <p className="text-sm font-bold font-label uppercase tracking-widest">Extracting…</p>
              <p className="text-xs text-on-surface-variant mt-1">Claude is reading your document</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-surface-container flex items-center justify-center z-10">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant">upload_file</span>
            </div>
            <div className="text-center z-10">
              <p className="text-sm font-bold font-label uppercase tracking-widest">
                Drop PDF here or click to browse
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Max 10 MB · PDF only
              </p>
            </div>
            <div className="flex items-center gap-2 z-10 mt-2 px-4 py-2 bg-inverse-surface">
              <span className="material-symbols-outlined text-[14px] text-inverse-primary">auto_awesome</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-inverse-on-surface">
                AI-Powered Extraction
              </span>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-error-container/10 border border-error text-error text-sm">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Partner details + prices ─────────────────────────────────────────

function PartnerDetailsStep({
  extraction,
  fileName,
  billingAddress,
  shippingAddress,
  items,
  onBillingChange,
  onShippingChange,
  onItemPriceChange,
  onBack,
  onNext,
}: {
  extraction: ExtractionResult;
  fileName: string;
  billingAddress: string;
  shippingAddress: string;
  items: ItemRow[];
  onBillingChange: (v: string) => void;
  onShippingChange: (v: string) => void;
  onItemPriceChange: (index: number, price: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const canProceed = billingAddress.trim().length > 0 && shippingAddress.trim().length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tighter font-headline">
          Partner Details
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Attach addresses and buy prices to{" "}
          <span className="font-mono font-bold text-on-surface">{extraction.poid}</span>
          {" "}· {fileName}
        </p>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            Billing Address <span className="text-error">*</span>
          </label>
          <textarea
            value={billingAddress}
            onChange={(e) => onBillingChange(e.target.value)}
            rows={4}
            placeholder={"Company Name\n123 Street, Suite 100\nCity, State, ZIP\nCountry"}
            className="w-full bg-surface-container-highest border-none focus:ring-0 focus:outline-none focus:border-b-2 focus:border-primary-fixed text-on-surface text-sm py-3 px-4 placeholder-on-surface-variant/40 resize-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
            Shipping Address <span className="text-error">*</span>
          </label>
          <textarea
            value={shippingAddress}
            onChange={(e) => onShippingChange(e.target.value)}
            rows={4}
            placeholder={"Warehouse / Dock\n456 Logistics Ave\nCity, State, ZIP\nCountry"}
            className="w-full bg-surface-container-highest border-none focus:ring-0 focus:outline-none focus:border-b-2 focus:border-primary-fixed text-on-surface text-sm py-3 px-4 placeholder-on-surface-variant/40 resize-none transition-all"
          />
          <button
            type="button"
            onClick={() => onShippingChange(billingAddress)}
            disabled={!billingAddress.trim()}
            className="self-start text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed underline underline-offset-2 transition-colors font-label"
          >
            Same as billing
          </button>
        </div>
      </div>

      {/* Buy prices per SKU */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">
            Buy Price per SKU
          </label>
          <span className="text-[9px] px-1.5 py-0.5 bg-surface-container font-label uppercase tracking-widest text-on-surface-variant">
            Optional
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container font-label uppercase text-[10px] tracking-[0.15em] text-on-surface-variant">
                <th className="py-3 px-5 text-left">SKU</th>
                <th className="py-3 px-5 text-right">Units Ordered</th>
                <th className="py-3 px-5 text-right">Buy Price (USD)</th>
                <th className="py-3 px-5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const price = parseFloat(item.buy_price);
                const lineTotal = !isNaN(price)
                  ? price * item.units_ordered
                  : null;
                return (
                  <tr
                    key={i}
                    className="bg-surface-container-low border-b border-surface-container hover:bg-surface-container-highest transition-colors"
                  >
                    <td className="py-3 px-5 font-mono text-sm font-bold text-on-surface">
                      {item.sku_name}
                    </td>
                    <td className="py-3 px-5 text-sm text-right text-on-surface-variant">
                      {item.units_ordered.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-on-surface-variant">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.buy_price}
                          onChange={(e) => onItemPriceChange(i, e.target.value)}
                          placeholder="0.00"
                          className="w-28 bg-surface-container-highest border-none focus:ring-0 focus:outline-none focus:border-b focus:border-primary-fixed text-on-surface text-sm py-1.5 px-2 text-right transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-5 text-sm font-bold text-right text-on-surface">
                      {lineTotal !== null
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(lineTotal)
                        : <span className="text-on-surface-variant font-normal">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-surface-container">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 bg-surface-container text-on-surface font-bold uppercase tracking-widest text-xs hover:bg-surface-container-highest transition-colors font-label"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-10 py-3 bg-primary-fixed text-on-primary-fixed font-black uppercase tracking-[0.15em] text-xs hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-label"
        >
          Review Order
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

function ReviewStep({
  extraction,
  billingAddress,
  shippingAddress,
  items,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  extraction: ExtractionResult;
  billingAddress: string;
  shippingAddress: string;
  items: ItemRow[];
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const totalBuyCost = items.reduce((sum, item) => {
    const p = parseFloat(item.buy_price);
    return sum + (isNaN(p) ? 0 : p * item.units_ordered);
  }, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tighter font-headline">
          Review & Submit
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Confirm all details before creating the purchase order.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* PO Summary */}
        <div className="bg-surface-container-low p-6 flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">
            PO Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: "PO Number", value: extraction.poid },
              { label: "Date",      value: extraction.date },
              {
                label: "Revenue",
                value: new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(extraction.total_revenue),
              },
              {
                label: "Total Buy Cost",
                value: totalBuyCost > 0
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalBuyCost)
                  : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-baseline gap-4">
                <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant font-label shrink-0">
                  {label}
                </span>
                <span className="text-sm font-bold text-on-surface font-mono truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-surface-container-low p-6 flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">
            Partner Addresses
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">location_on</span>
                Billing
              </p>
              <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                {billingAddress}
              </p>
            </div>
            <div className="border-t border-surface-container pt-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">local_shipping</span>
                Shipping
              </p>
              <p className="text-sm text-on-surface whitespace-pre-line leading-relaxed">
                {shippingAddress}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container font-label uppercase text-[10px] tracking-[0.15em] text-on-surface-variant">
              <th className="py-3 px-5 text-left">SKU</th>
              <th className="py-3 px-5 text-right">Units</th>
              <th className="py-3 px-5 text-right">Buy Price</th>
              <th className="py-3 px-5 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const price = parseFloat(item.buy_price);
              const lineTotal = !isNaN(price) ? price * item.units_ordered : null;
              return (
                <tr key={i} className="bg-surface-container-low border-b border-surface-container">
                  <td className="py-3 px-5 font-mono text-sm font-bold">{item.sku_name}</td>
                  <td className="py-3 px-5 text-sm text-right">{item.units_ordered.toLocaleString()}</td>
                  <td className="py-3 px-5 text-sm text-right font-mono">
                    {!isNaN(price)
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)
                      : <span className="text-on-surface-variant">—</span>}
                  </td>
                  <td className="py-3 px-5 text-sm text-right font-bold">
                    {lineTotal !== null
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lineTotal)
                      : <span className="text-on-surface-variant font-normal">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {submitError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-error-container/10 border border-error text-error text-sm">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {submitError}
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-surface-container">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-surface-container text-on-surface font-bold uppercase tracking-widest text-xs hover:bg-surface-container-highest disabled:opacity-40 transition-colors font-label"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-12 py-4 bg-primary-fixed text-on-primary-fixed font-black uppercase tracking-[0.15em] text-xs hover:brightness-110 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-label"
        >
          {submitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating PO…
            </>
          ) : (
            <>
              Submit to Review Queue
              <span className="material-symbols-outlined text-[16px]">send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Wizard orchestrator ──────────────────────────────────────────────────────

export default function POUploadWizard() {
  const router = useRouter();
  const [step, setStep]                     = useState<Step>(1);
  const [extraction, setExtraction]         = useState<ExtractionResult | null>(null);
  const [fileName, setFileName]             = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [items, setItems]                   = useState<ItemRow[]>([]);
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);

  function handleExtracted(data: ExtractionResult, name: string) {
    setExtraction(data);
    setFileName(name);
    setItems(data.items.map((i) => ({ ...i, buy_price: "" })));
    setStep(2);
  }

  function handleItemPriceChange(index: number, price: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, buy_price: price } : item))
    );
  }

  async function handleSubmit() {
    if (!extraction) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poid:             extraction.poid,
          date:             extraction.date,
          total_revenue:    extraction.total_revenue,
          status:           "pending",
          billing_address:  billingAddress.trim(),
          shipping_address: shippingAddress.trim(),
          items: items.map((item) => {
            const price = parseFloat(item.buy_price);
            return {
              sku_name:      item.sku_name,
              units_ordered: item.units_ordered,
              buy_price:     !isNaN(price) ? price : null,
            };
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json?.error ?? "Submission failed.");
        setSubmitting(false);
        return;
      }
      // Return to Review Queue — final approval is handled by a separate reviewer
      router.push(`/?submitted=${encodeURIComponent(json.poid)}`);
    } catch {
      setSubmitError("Network error — please retry.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <StepIndicator current={step} />

      {step === 1 && <UploadStep onExtracted={handleExtracted} />}

      {step === 2 && extraction && (
        <PartnerDetailsStep
          extraction={extraction}
          fileName={fileName}
          billingAddress={billingAddress}
          shippingAddress={shippingAddress}
          items={items}
          onBillingChange={setBillingAddress}
          onShippingChange={setShippingAddress}
          onItemPriceChange={handleItemPriceChange}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && extraction && (
        <ReviewStep
          extraction={extraction}
          billingAddress={billingAddress}
          shippingAddress={shippingAddress}
          items={items}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      )}
    </div>
  );
}
