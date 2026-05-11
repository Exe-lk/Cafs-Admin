"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminSidebar({
  className,
  onNavigate,
  headerRight,
}: {
  className?: string;
  onNavigate?: () => void;
  headerRight?: ReactNode;
}) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: "Calendar", icon: "calendar_today" as const },
    { href: "/admin/services", label: "Services", icon: "design_services" as const },
    { href: "/admin/connect", label: "Connect", icon: "hub" as const },
    { href: "/admin/customers", label: "Customers", icon: "group" as const },
    { href: "/admin/theraphist", label: "Theraphist", icon: "settings" as const },
    { href: "/admin/settings", label: "Settings", icon: "display_settings" as const },
  ];

  return (
    <aside
      className={cx(
        "flex h-full w-64 flex-col bg-slate-100 px-4 py-6 dark:bg-slate-900",
        className,
      )}
    >
      <div className="mb-10 flex items-start justify-between gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mgmt-primary text-mgmt-on-primary">
          <MaterialSymbol name="concierge" className="text-[22px]" filled />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-none text-emerald-900 dark:text-emerald-100">
                CAFS
              </h1>
              <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-mgmt-on-surface-variant">
                Admin
              </p>
            </div>
            {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ease-in-out",
                active
                  ? "scale-95 border-l-4 border-emerald-700 bg-emerald-100 font-semibold text-emerald-800 dark:border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-200"
                  : "border-l-4 border-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-emerald-900/10",
              )}
            >
              <MaterialSymbol name={item.icon} className="text-[22px]" />
              <span className="text-[0.75rem] font-medium tracking-[0.05em]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

