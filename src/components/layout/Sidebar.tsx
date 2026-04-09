"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/",        icon: "checklist",   label: "Review Queue" },
  { href: "/upload",  icon: "upload_file", label: "Upload PO"    },
  { href: "/history", icon: "history",     label: "History"      },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname.startsWith("/po/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface dark:bg-inverse-surface flex flex-col py-8 z-50 border-r border-surface-container">

      {/* ── Brand ── */}
      <div className="px-6 mb-12">
        <h1 className="text-xl font-black text-on-surface tracking-tighter font-headline">
          LUNA
        </h1>
        <p className="font-label uppercase text-[10px] tracking-widest text-on-surface-variant mt-1">
          Order Dashboard
        </p>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 space-y-0.5">
        {navLinks.map(({ href, icon, label }) =>
          isActive(href) ? (
            <Link
              key={href}
              href={href}
              className="flex items-center px-6 py-3 text-on-surface border-l-4 border-primary-fixed bg-surface-container-low font-label uppercase text-xs tracking-widest transition-all duration-150"
            >
              <span className="material-symbols-outlined mr-4 text-[20px]">{icon}</span>
              {label}
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              className="flex items-center px-6 py-3 border-l-4 border-transparent text-on-surface-variant font-label uppercase text-xs tracking-widest hover:text-on-surface hover:bg-surface-container transition-all duration-150"
            >
              <span className="material-symbols-outlined mr-4 text-[20px]">{icon}</span>
              {label}
            </Link>
          )
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="mt-auto pt-4 border-t border-surface-container">
        <Link
          href="/settings"
          className="flex items-center px-6 py-3 border-l-4 border-transparent text-on-surface-variant font-label uppercase text-xs tracking-widest hover:text-on-surface hover:bg-surface-container transition-all duration-150"
        >
          <span className="material-symbols-outlined mr-4 text-[20px]">settings</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
