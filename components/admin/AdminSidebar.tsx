"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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

const NAV_ICON_SIZE = 18;
const NAV_CHILD_ICON_SIZE = 18;
const SIDEBAR_CONTROL_ICON_SIZE = 18;

const NAV_ITEM_LABEL = "text-sm font-semibold text-mgmt-on-surface";
const NAV_CHILD_LABEL = "text-sm font-semibold text-mgmt-on-surface-variant";
const NAV_CHILD_LABEL_ACTIVE = "text-sm font-semibold text-mgmt-on-surface";
const NAV_ITEM_BG_ACTIVE = "bg-mgmt-surface-container-low";
const NAV_ITEM_BG_HOVER = "hover:bg-mgmt-surface-container-low";
const NAV_ICON_CLASS = "text-mgmt-on-surface";

function linkClass(active: boolean, collapsed: boolean) {
  return cx(
    "flex items-center rounded-lg transition-all duration-150 ease-in-out",
    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
    active ? NAV_ITEM_BG_ACTIVE : NAV_ITEM_BG_HOVER,
  );
}

function CalendarNavGroup({
  entry,
  collapsed,
  pathname,
  onNavigate,
}: {
  entry: Extract<NavEntry, { kind: "group" }>;
  collapsed: boolean;
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const calendarActive = pathname === entry.href;
  const onAppointments =
    pathname === "/admin/appointments" || Boolean(pathname?.startsWith("/admin/appointments/"));
  const [expanded, setExpanded] = useState(onAppointments);

  useEffect(() => {
    if (onAppointments) setExpanded(true);
  }, [onAppointments]);

  if (collapsed) {
    return (
      <Link
        href={entry.href}
        onClick={() => onNavigate?.()}
        className={linkClass(calendarActive, true)}
        title={entry.label}
      >
        <MaterialSymbol name={entry.icon} size={NAV_ICON_SIZE} className={NAV_ICON_CLASS} />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cx(
          "flex items-center overflow-hidden rounded-lg transition-all duration-150 ease-in-out",
          calendarActive ? NAV_ITEM_BG_ACTIVE : NAV_ITEM_BG_HOVER,
        )}
      >
        <Link
          href={entry.href}
          onClick={() => onNavigate?.()}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 transition-colors"
        >
          <MaterialSymbol name={entry.icon} size={NAV_ICON_SIZE} className={NAV_ICON_CLASS} />
          <span className={NAV_ITEM_LABEL}>{entry.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mgmt-on-surface-variant transition-colors hover:bg-slate-100 hover:text-mgmt-on-surface"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse Calendar menu" : "Expand Calendar menu"}
        >
          <MaterialSymbol
            name="expand_more"
            size={NAV_CHILD_ICON_SIZE}
            className={cx("transition-transform duration-150", expanded && "rotate-180")}
          />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 space-y-0.5 border-l border-slate-200 pl-2">
          {entry.children.map((child) => {
            const childActive =
              pathname === child.href || Boolean(pathname?.startsWith(`${child.href}/`));
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => onNavigate?.()}
                className={cx(
                  "flex items-center gap-2.5 rounded-lg py-2 pr-3 pl-2 transition-all duration-150 ease-in-out",
                  childActive ? NAV_ITEM_BG_ACTIVE : NAV_ITEM_BG_HOVER,
                )}
              >
                <MaterialSymbol
                  name={child.icon}
                  size={NAV_CHILD_ICON_SIZE}
                  className={childActive ? NAV_ICON_CLASS : "text-mgmt-on-surface-variant"}
                />
                <span className={childActive ? NAV_CHILD_LABEL_ACTIVE : NAV_CHILD_LABEL}>
                  {child.label}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminSidebar({
  className,
  onNavigate,
  headerRight,
  collapsed = false,
  onToggleCollapse,
}: {
  className?: string;
  onNavigate?: () => void;
  headerRight?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { displayName, initials, loading: profileLoading } = useAdminProfile();

  return (
    <aside
      className={cx(
        "flex h-full flex-col bg-mgmt-surface-container-lowest py-6 transition-[width,padding] duration-200 ease-in-out",
        collapsed ? "w-16 px-2" : "w-64 px-4",
        className,
      )}
    >
      {collapsed ? (
        <div className="mb-8 flex flex-col items-center gap-4 px-1">
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Expand menu"
            >
              <MaterialSymbol name="menu" size={SIDEBAR_CONTROL_ICON_SIZE} />
            </button>
          ) : null}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white">
            <Image
              src="/cafs-logo.png"
              alt="CAFS"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </div>
      ) : (
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
                <h1 className="text-xl font-bold leading-none text-slate-900">CAFS</h1>
                <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-slate-600">
                  Admin
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {onToggleCollapse ? (
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Collapse menu"
                  >
                    <MaterialSymbol name="chevron_left" size={SIDEBAR_CONTROL_ICON_SIZE} />
                  </button>
                ) : null}
                {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
              </div>
            </div>
          </div>
        </div>
      )}

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
                className={linkClass(Boolean(active), collapsed)}
                title={collapsed ? entry.label : undefined}
              >
                <MaterialSymbol name={entry.icon} size={NAV_ICON_SIZE} className={NAV_ICON_CLASS} />
                {!collapsed ? <span className={NAV_ITEM_LABEL}>{entry.label}</span> : null}
              </Link>
            );
          }

          const groupEntry = entry as Extract<NavEntry, { kind: "group" }>;

          return (
            <CalendarNavGroup
              key={entry.href}
              entry={groupEntry}
              collapsed={collapsed}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      <div className={cx("mt-4 shrink-0 border-slate-200 pt-4", collapsed ? "px-0" : "px-2")}>
        <div
          className={cx(
            "flex items-center rounded-lg py-2",
            collapsed ? "justify-center px-0" : "gap-3 px-2",
          )}
          title={collapsed && !profileLoading ? displayName : undefined}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E7E7E7] text-sm font-bold text-[#5F5F5F]">
            {profileLoading ? (
              <MaterialSymbol name="account_circle" size={SIDEBAR_CONTROL_ICON_SIZE} className="text-[#5F5F5F]" />
            ) : (
              initials
            )}
            {collapsed ? (
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500" />
            ) : null}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">
                {profileLoading ? "Loading…" : displayName}
              </p>
              <p className="truncate text-[0.65rem] font-medium uppercase tracking-[0.08em] text-slate-600">
                Profile
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
