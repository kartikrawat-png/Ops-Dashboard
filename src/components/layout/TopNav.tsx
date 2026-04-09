"use client";

import { usePathname } from "next/navigation";

type Crumb = { label: string; muted?: boolean };

function getBreadcrumbs(pathname: string): Crumb[] {
  if (pathname.startsWith("/po/")) {
    return [
      { label: "Verification Pipeline", muted: true },
      { label: "PO Review" },
    ];
  }
  if (pathname === "/") {
    return [{ label: "Review Queue" }];
  }
  if (pathname === "/upload") {
    return [
      { label: "Upload PO", muted: true },
      { label: "New Purchase Order" },
    ];
  }
  if (pathname === "/history") {
    return [{ label: "History" }];
  }
  return [{ label: pathname }];
}

export default function TopNav() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-surface-container flex justify-between items-center px-8 py-4 w-full">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-3">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-3">
            {i > 0 && (
              <span className="text-outline-variant font-label text-sm">/</span>
            )}
            <span
              className={`font-label font-bold text-sm uppercase tracking-tight ${
                crumb.muted ? "text-on-surface-variant" : "text-on-surface"
              }`}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* ── Right side ── */}
      <div className="flex items-center gap-6">
        {/* Notification bell */}
        <button className="relative text-on-surface hover:bg-surface-container p-2 transition-colors">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary-fixed rounded-full" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface font-label">OPERATOR_01</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter font-medium">
              Lvl 3 Clearance
            </p>
          </div>
          {/* Avatar placeholder */}
          <div className="w-9 h-9 bg-surface-container-highest flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
