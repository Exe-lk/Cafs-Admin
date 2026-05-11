"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSettingsSubNav from "@/components/admin/AdminSettingsSubNav";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const OPTIONS = [
  { label: "Brand", href: "/admin/settings/brand" },
  { label: "Booking preferences", href: "/admin/settings/booking-preferences" },
  { label: "Notifications", href: "/admin/settings/notifications" },
  { label: "Reviews", href: "/admin/settings/reviews" },
] as const;

export default function AdminSettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const active = useMemo(() => {
    return OPTIONS.find((o) => pathname === o.href) ?? OPTIONS[0]!;
  }, [pathname]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Desktop: fixed column so it never moves when the main pane (or window) scrolls */}
      <div
        className="hidden overflow-y-auto border-r border-mgmt-outline-variant bg-mgmt-surface-container-lowest md:fixed md:left-64 md:top-0 md:z-40 md:flex md:h-dvh md:w-72 md:flex-col"
        data-purpose="settings-subnav-fixed"
      >
        <AdminSettingsSubNav />
      </div>
      {/* Reserve horizontal space so content is not hidden under the fixed sub-nav */}
      <div className="hidden w-72 shrink-0 md:block" aria-hidden />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-mgmt-surface-container-lowest">
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
                  <MaterialSymbol name="display_settings" className="text-[18px] text-mgmt-on-surface-variant" />
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
                {OPTIONS.map((opt) => {
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
                          ? "bg-mgmt-surface-container-low font-semibold text-mgmt-on-surface"
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
