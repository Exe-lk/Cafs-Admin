"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const ITEMS = [
  { href: "/admin/settings/brand", label: "Brand" },
  { href: "/admin/settings/booking-preferences", label: "Booking preferences" },
  { href: "/admin/settings/notifications", label: "Notifications" },
  { href: "/admin/settings/reviews", label: "Reviews" },
] as const;

export default function AdminSettingsSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className="flex min-h-0 w-full flex-1 flex-col bg-mgmt-surface-container-lowest"
      data-purpose="secondary-navigation"
    >
      <div className="p-6">
        <h2 className="text-xl font-bold text-mgmt-on-surface">Settings</h2>
      </div>
      <nav className="space-y-1 px-4 pb-6" aria-label="Settings sections">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-mgmt-surface-container-low text-mgmt-on-surface"
                  : "text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface",
              )}
            >
              <span>{item.label}</span>
              <svg
                className="h-4 w-4 shrink-0 opacity-60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
