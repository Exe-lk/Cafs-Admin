"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppointmentsSubNav, {
  APPOINTMENT_STATUS_OPTIONS,
  appointmentStatusFromSearchParams,
  appointmentsHref,
} from "@/components/admin/AppointmentsSubNav";
import { adminSidebarInsetLeft } from "@/components/admin/adminSidebarLayout";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminAppointmentsShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeStatus = appointmentStatusFromSearchParams(searchParams.get("status"));

  const active = useMemo(() => {
    return (
      APPOINTMENT_STATUS_OPTIONS.find((item) => item.status === activeStatus) ??
      APPOINTMENT_STATUS_OPTIONS[0]!
    );
  }, [activeStatus]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div
        className={cx(
          "hidden overflow-y-auto bg-mgmt-surface-container-lowest md:fixed md:top-0 md:z-40 md:flex md:h-dvh md:w-72 md:flex-col",
          adminSidebarInsetLeft("md"),
        )}
        data-purpose="appointments-subnav-fixed"
      >
        <AppointmentsSubNav />
      </div>
      <div className="hidden w-72 shrink-0 md:block" aria-hidden />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-mgmt-surface-container-lowest">
        <header className="sticky top-14 z-30 border-b border-mgmt-outline-variant/10 bg-white/70 px-4 py-2 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-mgmt-on-surface">Appointments</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="inline-flex h-9 w-56 items-center justify-between rounded-lg border border-mgmt-outline-variant bg-white/70 px-3 text-sm font-medium text-mgmt-on-surface hover:bg-white"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MaterialSymbol name="event_note" className="text-[18px] text-mgmt-on-surface-variant" />
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
                {APPOINTMENT_STATUS_OPTIONS.map((opt) => {
                  const href = appointmentsHref(opt.status);
                  const isActive = opt.status === active.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push(href);
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-mgmt-surface-container-lowest">
          {children}
        </div>
      </div>
    </div>
  );
}
