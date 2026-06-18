"use client";

import type { ReactNode } from "react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ServicesSubNav from "@/components/admin/ServicesSubNav";
import { adminSidebarInsetLeft } from "@/components/admin/adminSidebarLayout";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminServicesShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const options = useMemo(
    () => [
      { label: "Services", href: "/admin/services" },
      { label: "Classes", href: "/admin/services/classes" },
    ],
    [],
  );

  const active = pathname?.startsWith("/admin/services/classes") ? options[1]! : options[0]!;

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Desktop sub nav: fixed full-height white column */}
      <div
        className={cx(
          "hidden overflow-y-auto bg-mgmt-surface-container-lowest md:fixed md:top-0 md:z-40 md:flex md:h-dvh md:w-72 md:flex-col",
          adminSidebarInsetLeft("md"),
        )}
        data-purpose="services-subnav-fixed"
      >
        <Suspense fallback={null}>
          <ServicesSubNav />
        </Suspense>
      </div>
      <div className="hidden w-72 shrink-0 md:block" aria-hidden />

      {/* Mobile header + in-page dropdown */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-mgmt-surface-container-lowest">
        <header className="sticky top-14 z-30 border-b border-mgmt-outline-variant/10 bg-white/70 px-4 py-2 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-mgmt-on-surface">{active.label}</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="inline-flex h-9 w-56 items-center justify-between rounded-lg border border-mgmt-outline-variant bg-white/70 px-3 text-sm font-medium text-mgmt-on-surface hover:bg-white"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MaterialSymbol name="layers" className="text-[18px] text-mgmt-on-surface-variant" />
                  <span className="min-w-0 truncate">{active.label}</span>
                </span>
                <MaterialSymbol
                  name="expand_more"
                  className={cx(
                    "shrink-0 text-[18px] text-mgmt-on-surface-variant transition-transform",
                    dropdownOpen && "rotate-180",
                  )}
                />
              </button>

              <div
                className={cx(
                  "absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-mgmt-outline-variant bg-white shadow-lg",
                  dropdownOpen ? "block" : "hidden",
                )}
                role="menu"
              >
                {options.map((opt) => {
                  const isActive = opt.href === active.href;
                  return (
                    <button
                      key={opt.href}
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push(opt.href);
                      }}
                      className={cx(
                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm",
                        isActive
                          ? "bg-mgmt-surface-container-low text-mgmt-on-surface font-semibold"
                          : "text-mgmt-on-surface hover:bg-mgmt-surface-container-low",
                      )}
                      role="menuitem"
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-mgmt-surface-container-lowest">{children}</div>
      </div>
    </div>
  );
}

