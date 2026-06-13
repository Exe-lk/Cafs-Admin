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

type NavIcon =
  | "calendar_today"
  | "bookmarks"
  | "format_list_bulleted"
  | "sentiment_satisfied"
  | "stethoscope"
  | "settings"
  | "event_note";

type NavChild = {
  href: string;
  label: string;
  icon: NavIcon;
};

type NavEntry =
  | {
      kind: "group";
      href: string;
      label: string;
      icon: NavIcon;
      children: NavChild[];
    }
  | {
      kind: "link";
      href: string;
      label: string;
      icon: NavIcon;
    };

const NAV_ENTRIES: NavEntry[] = [
  {
    kind: "group",
    href: "/admin",
    label: "Calendar",
    icon: "calendar_today",
    children: [{ href: "/admin/appointments", label: "Appointments", icon: "event_note" }],
  },
  { kind: "link", href: "/admin/service-types", label: "Service Categories", icon: "bookmarks" },
  { kind: "link", href: "/admin/services", label: "Services", icon: "format_list_bulleted" },
  { kind: "link", href: "/admin/customers", label: "Customers", icon: "sentiment_satisfied" },
  { kind: "link", href: "/admin/theraphist", label: "Theraphist", icon: "stethoscope" },
  { kind: "link", href: "/admin/settings", label: "Settings", icon: "settings" },
];

function linkClass(active: boolean) {
  return cx(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ease-in-out",
    active
      ? "bg-[#F1F1F1] font-semibold text-slate-900"
      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
  );
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
        {NAV_ENTRIES.map((entry) => {
          if (entry.kind === "link") {
            const active =
              pathname === entry.href ||
              (entry.href !== "/admin" && pathname?.startsWith(`${entry.href}/`));
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={() => onNavigate?.()}
                className={linkClass(Boolean(active))}
              >
                <MaterialSymbol name={entry.icon} className="text-[22px]" />
                <span className="text-[0.75rem] font-medium tracking-[0.05em]">{entry.label}</span>
              </Link>
            );
          }

          const calendarActive = pathname === entry.href;

          return (
            <div key={entry.href} className="space-y-0.5">
              <Link
                href={entry.href}
                onClick={() => onNavigate?.()}
                className={linkClass(calendarActive)}
              >
                <MaterialSymbol name={entry.icon} className="text-[22px]" />
                <span className="text-[0.75rem] font-medium tracking-[0.05em]">{entry.label}</span>
              </Link>

              <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
                {entry.children.map((child) => {
                  const childActive =
                    pathname === child.href || pathname?.startsWith(`${child.href}/`);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => onNavigate?.()}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg py-2 pr-3 pl-2 transition-all duration-150 ease-in-out",
                        childActive
                          ? "bg-[#F1F1F1] font-semibold text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <MaterialSymbol name={child.icon} className="text-[18px]" />
                      <span className="text-[0.7rem] font-medium tracking-[0.04em]">
                        {child.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
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
