"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import EditServiceModal from "@/components/admin/EditServiceModal";
import {
  notifyServiceCategoriesReload,
  serviceCategoryHref,
  serviceCategoryLabel,
} from "@/components/admin/serviceCategories";
import {
  SECONDARY_NAV_HEADING_CLASS,
  SECONDARY_NAV_HEADING_WRAP_CLASS,
} from "@/components/admin/secondaryNavLayout";
import { useAdminServiceCategories } from "@/components/admin/useAdminServiceCategories";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ServicesSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get("category");
  const onClasses = pathname?.startsWith("/admin/services/classes") ?? false;
  const { categories, loading, reload } = useAdminServiceCategories();
  const totalServiceCount = useMemo(
    () => categories.reduce((sum, category) => sum + category.count, 0),
    [categories],
  );

  /** When on the services route, user can collapse the list; on classes route the section stays closed. */
  const [servicesCollapsedByUser, setServicesCollapsedByUser] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const servicesOpen = !onClasses && !servicesCollapsedByUser;
  const onServicesIndex = pathname === "/admin/services" && !onClasses;

  return (
    <aside
      className="flex min-h-0 w-full flex-1 flex-col bg-mgmt-surface-container-lowest"
      data-purpose="secondary-navigation"
    >
      <div className={SECONDARY_NAV_HEADING_WRAP_CLASS}>
        <h2 className={SECONDARY_NAV_HEADING_CLASS}>Services & Classes</h2>
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
              href="/admin/services"
              className={cx(
                "flex min-w-0 flex-1 items-center justify-between px-2 py-2 text-sm font-semibold",
                onClasses
                  ? "text-mgmt-on-surface-variant hover:text-mgmt-on-surface"
                  : onServicesIndex && !activeCategoryId
                    ? "text-mgmt-on-surface"
                    : "text-mgmt-on-surface",
              )}
            >
              <span>Services ({totalServiceCount})</span>
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
                onClick={() => setServicesCollapsedByUser((c) => !c)}
                className="mr-1 shrink-0 rounded p-1 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                aria-expanded={servicesOpen}
                aria-label={servicesOpen ? "Collapse services" : "Expand services"}
              >
                <svg
                  className={cx("h-4 w-4 transition-transform", servicesOpen && "rotate-180")}
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
          {servicesOpen && (
            <div className="mt-2 space-y-2 pl-4">
              {loading ? (
                <p className="text-sm text-mgmt-on-surface-variant">Loading…</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-mgmt-on-surface-variant">No service categories yet.</p>
              ) : (
                categories.map((category) => {
                  const isActive = onServicesIndex && activeCategoryId === category.id;
                  return (
                    <Link
                      key={category.id}
                      href={serviceCategoryHref(category.id)}
                      className={cx(
                        "block text-sm hover:text-mgmt-on-surface",
                        isActive
                          ? "font-medium text-mgmt-on-surface"
                          : "text-mgmt-on-surface-variant",
                      )}
                    >
                      {serviceCategoryLabel(category)}
                    </Link>
                  );
                })
              )}
              <button
                type="button"
                onClick={() => setCategoryOpen(true)}
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
                New service category
              </button>
            </div>
          )}
        </div>

        <div>
          <Link
            href="/admin/services/classes"
            className={cx(
              "flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
              onClasses
                ? "bg-mgmt-surface-container-low text-mgmt-on-surface"
                : "text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low",
            )}
          >
            <span>Classes (1)</span>
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
        </div>
      </div>

      {categoryOpen ? (
        <EditServiceModal
          service={null}
          onClose={() => setCategoryOpen(false)}
          onSaved={() => {
            setCategoryOpen(false);
            reload();
            notifyServiceCategoriesReload();
          }}
        />
      ) : null}
    </aside>
  );
}

