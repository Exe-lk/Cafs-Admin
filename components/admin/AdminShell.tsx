"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function titleForPath(pathname: string | null): string {
  if (!pathname) return "Dashboard";
  if (pathname === "/admin") return "Calendar";
  if (pathname.startsWith("/admin/services")) return "Services";
  // if (pathname.startsWith("/admin/connect")) return "Connect";
  if (pathname.startsWith("/admin/customers")) return "Customers";
  if (pathname.startsWith("/admin/theraphist")) return "Theraphist";
  if (pathname.startsWith("/admin/settings")) return "Settings";
  return "Admin";
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const title = useMemo(() => titleForPath(pathname), [pathname]);

  return (
    <div className="theraphist-theme light min-h-dvh bg-mgmt-background font-sans text-mgmt-on-surface">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AdminSidebar className="fixed left-0 top-0 z-50 h-dvh w-64" />
      </div>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-mgmt-outline-variant/10 bg-white/85 px-4 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
          aria-label="Open menu"
        >
          <MaterialSymbol name="menu" className="text-[22px]" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-mgmt-on-surface">{title}</p>
          <p className="truncate text-[0.7rem] font-medium uppercase tracking-wider text-mgmt-on-surface-variant">
            Admin
          </p>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cx(
          "fixed inset-0 z-[80] md:hidden",
          mobileNavOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          className={cx(
            "absolute inset-0 bg-black/35 transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
        />
        <div
          className={cx(
            "absolute inset-y-0 left-0 w-[78vw] max-w-[320px] transform transition-transform",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <AdminSidebar
            className="h-full w-full"
            onNavigate={() => setMobileNavOpen(false)}
            headerRight={
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-label="Close menu"
              >
                <MaterialSymbol name="close" className="text-[22px]" />
              </button>
            }
          />
        </div>
      </div>

      {/* Content */}
      <div className="ml-0 flex min-h-dvh flex-col md:ml-64">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

