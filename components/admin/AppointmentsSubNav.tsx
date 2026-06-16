"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SECONDARY_NAV_HEADING_CLASS,
  SECONDARY_NAV_HEADING_WRAP_CLASS,
} from "@/components/admin/secondaryNavLayout";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const APPOINTMENT_STATUS_OPTIONS = [
  { status: "all", label: "All appointments" },
  { status: "pending_payment", label: "Awaiting payment" },
  { status: "pending_confirmation", label: "Awaiting Confirmation" },
  { status: "confirmed", label: "Confirmed Payment" },
] as const;

export type AppointmentStatusNav = (typeof APPOINTMENT_STATUS_OPTIONS)[number]["status"];

export function appointmentStatusFromSearchParams(
  value: string | null | undefined,
): AppointmentStatusNav {
  const match = APPOINTMENT_STATUS_OPTIONS.find((item) => item.status === value);
  return match?.status ?? "all";
}

export function appointmentsHref(status: AppointmentStatusNav) {
  return status === "all" ? "/admin/appointments" : `/admin/appointments?status=${status}`;
}

export default function AppointmentsSubNav() {
  const searchParams = useSearchParams();
  const activeStatus = appointmentStatusFromSearchParams(searchParams.get("status"));

  return (
    <aside
      className="flex min-h-0 w-full flex-1 flex-col bg-mgmt-surface-container-lowest"
      data-purpose="secondary-navigation"
    >
      <div className={SECONDARY_NAV_HEADING_WRAP_CLASS}>
        <h2 className={SECONDARY_NAV_HEADING_CLASS}>Appointments</h2>
      </div>
      <nav className="space-y-1 px-4 pb-6" aria-label="Appointment states">
        {APPOINTMENT_STATUS_OPTIONS.map((item) => {
          const isActive = activeStatus === item.status;
          const href = appointmentsHref(item.status);
          return (
            <Link
              key={item.status}
              href={href}
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
