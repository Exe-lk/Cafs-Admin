"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminProfile } from "@/components/admin/useAdminProfile";

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
  const { displayName, initials, loading: profileLoading } = useAdminProfile();

  const items = [
    { href: "/admin", label: "Calendar", icon: "calendar_today" as const },
    { href: "/admin/service-types", label: "Service Categories", icon: "bookmarks" as const },
    { href: "/admin/services", label: "Services", icon: "medical_services" as const },
    // { href: "/admin/connect", label: "Connect", icon: "hub" as const },
    { href: "/admin/customers", label: "Customers", icon: "group" as const },
    { href: "/admin/theraphist", label: "Theraphist", icon: "stethoscope" as const },
    { href: "/admin/settings", label: "Settings", icon: "settings" as const },
  ];

  return (
    <aside
      className={cx("flex h-full w-64 flex-col bg-[#FFFFFF] px-4 py-6", className)}
    >
      <div className="mb-10 flex items-start justify-between gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white">
          <Image
            src="/cafs-logo.png"
            alt="CAFS"
            width={40}
            height={40}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-none text-slate-900">
                CAFS
              </h1>
              <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-slate-600">
                Admin
              </p>
            </div>
            {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
          </div>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto">
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
                  ? "scale-95 border-l-4 border-emerald-700 bg-emerald-50 font-semibold text-slate-900"
                  : "border-l-4 border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <MaterialSymbol name={item.icon} className="text-[22px]" />
              <span className="text-[0.75rem] font-medium tracking-[0.05em]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0  border-slate-200 px-2 pt-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E7E7E7] text-sm font-bold text-[#5F5F5F]">
            {profileLoading ? (
              <MaterialSymbol name="account_circle" className="text-[22px] text-[#5F5F5F]" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">
              {profileLoading ? "Loading…" : displayName}
            </p>
            <p className="truncate text-[0.65rem] font-medium uppercase tracking-[0.08em] text-slate-600">
              Profile
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

