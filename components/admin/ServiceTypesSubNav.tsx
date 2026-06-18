"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  SECONDARY_NAV_HEADING_CLASS,
  SECONDARY_NAV_HEADING_WRAP_CLASS,
} from "@/components/admin/secondaryNavLayout";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ServiceTypesSubNav() {
  const pathname = usePathname();
  const onClasses = pathname?.startsWith("/admin/service-types/classes") ?? false;

  const [serviceTypesCollapsedByUser, setServiceTypesCollapsedByUser] = useState(false);
  const serviceTypesOpen = !onClasses && !serviceTypesCollapsedByUser;

  return (
    <aside
      className="flex min-h-0 w-full flex-1 flex-col bg-mgmt-surface-container-lowest"
      data-purpose="secondary-navigation"
    >
      <div className={SECONDARY_NAV_HEADING_WRAP_CLASS}>
        <h2 className={SECONDARY_NAV_HEADING_CLASS}>Service & Class types</h2>
      </div>
      <div className="flex-1 px-4 pb-6">
        <div className="mb-4">
          <div
            className={cx(
              "flex w-full items-center overflow-hidden rounded-lg transition-colors",
              !onClasses
                ? "bg-mgmt-surface-container-low"
                : "text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low",
            )}
          >
            <Link
              href="/admin/service-types"
              className={cx(
                "flex min-w-0 flex-1 items-center justify-between px-2 py-2 text-sm font-semibold",
                onClasses
                  ? "text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
                  : "text-mgmt-on-surface",
              )}
            >
              <span>Service types (4)</span>
              {onClasses && (
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
            {!onClasses && (
              <button
                type="button"
                onClick={() => setServiceTypesCollapsedByUser((c) => !c)}
                className="mr-1 shrink-0 rounded p-1 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-expanded={serviceTypesOpen}
                aria-label={serviceTypesOpen ? "Collapse service types" : "Expand service types"}
              >
                <svg
                  className={cx("h-4 w-4 transition-transform", serviceTypesOpen && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          {serviceTypesOpen && (
            <div className="mt-2 space-y-2 pl-4">
              <Link
                href="/admin/service-types"
                className={cx(
                  "block text-sm hover:text-mgmt-on-surface",
                  !onClasses ? "font-medium text-mgmt-on-surface" : "text-mgmt-on-surface-variant",
                )}
              >
                Exercise session by … (1)
              </Link>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                New service type category
              </button>
            </div>
          )}
        </div>

        {/* <div>
          <Link
            href="/admin/service-types/classes"
            className={cx(
              "flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
              onClasses
                ? "bg-mgmt-surface-container-low text-mgmt-on-surface"
                : "text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low",
            )}
          >
            <span>Classes types(4)</span>
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          {onClasses && (
            <div className="mt-2 space-y-2 pl-4">
              <p className="text-sm text-mgmt-on-surface-variant">
                Manage recurring classes and group sessions from this section.
              </p>
            </div>
          )}
        </div> */}
      </div>
    </aside>
  );
}
