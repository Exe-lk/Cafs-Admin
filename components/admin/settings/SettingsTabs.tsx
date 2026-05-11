"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const TABS = [
  { href: "/admin/theraphist/about", label: "About" },
  { href: "/admin/theraphist/working-hours", label: "Working hours" },
  { href: "/admin/theraphist/breaks", label: "Breaks" },
  { href: "/admin/theraphist/time-off", label: "Time off" },
] as const;

export default function SettingsTabs() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const active = useMemo(() => {
    return TABS.find((t) => t.href === pathname) ?? TABS[0];
  }, [pathname]);

  return (
    <nav className="border-b border-mgmt-surface-container-low">
      {/* Mobile: dropdown */}
      <div className="relative py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-full items-center justify-between rounded-xl border border-mgmt-outline-variant bg-white/70 px-4 text-sm font-semibold text-mgmt-on-surface"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="min-w-0 truncate">{active?.label ?? "About"}</span>
          <MaterialSymbol
            name="expand_more"
            className={cx(
              "text-[20px] text-mgmt-on-surface-variant transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <div
          className={cx(
            "absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-mgmt-outline-variant bg-white shadow-lg",
            open ? "block" : "hidden",
          )}
          role="menu"
        >
          {TABS.map((t) => {
            const isActive = pathname === t.href;
            return (
              <button
                key={t.href}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(t.href);
                }}
                className={cx(
                  "flex w-full items-center justify-between px-4 py-3 text-left text-sm",
                  isActive
                    ? "bg-mgmt-surface-container-low text-mgmt-on-surface font-semibold"
                    : "text-mgmt-on-surface hover:bg-mgmt-surface-container-low",
                )}
                role="menuitem"
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: tabs */}
      <div className="hidden items-center justify-between md:flex">
        <div className="flex gap-8">
          {TABS.map((t) => {
            const isActive = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cx(
                  "pb-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-mgmt-primary text-mgmt-primary"
                    : "text-mgmt-on-surface-variant hover:text-mgmt-primary",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            notifications
          </span>
        </button>
      </div>
    </nav>
  );
}

