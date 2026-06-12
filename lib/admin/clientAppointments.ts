import type {
  AdminAppointmentDay,
  AdminCustomerStats,
} from "@/components/admin/AdminCustomerDetail";

export type ClientAppointmentListItem = {
  appointmentId: string;
  status: string;
  appointmentType: "online" | "in_person";
  startAt: string;
  endAt: string;
  therapist: {
    fullName: string;
    profilePhotoUrl?: string | null;
  };
  service: {
    name: string;
  };
  payment?: {
    amount: number | null;
    status: string;
  } | null;
};

const CANCELLED_STATUSES = new Set(["cancelled", "no_show", "expired"]);

function formatAppointmentType(t: string): string {
  if (t === "online") return "Online";
  if (t === "in_person") return "In-person";
  return t.replace(/_/g, " ");
}

function formatAppointmentStatus(s: string): string {
  return s.replace(/_/g, " ");
}

function formatDateLine(d: Date): string {
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${day} ${month}, ${weekday}`;
}

function formatTimeRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return `${start.toLocaleTimeString("en-US", opts)} – ${end.toLocaleTimeString("en-US", opts)}`;
}

export function lastActivityFromAppointments(items: ClientAppointmentListItem[]): string {
  if (!items.length) return "No appointments yet";
  const latest = [...items].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  )[0]!;
  const d = new Date(latest.startAt);
  const when = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${when} — ${formatAppointmentStatus(latest.status)}`;
}

export function buildCustomerStatsFromAppointments(
  items: ClientAppointmentListItem[],
): AdminCustomerStats {
  let ltvUsd = 0;
  for (const item of items) {
    if (item.payment?.status === "paid" && item.payment.amount != null) {
      ltvUsd += item.payment.amount;
    }
  }
  return {
    totalBookings: items.length,
    cancellations: items.filter((item) => CANCELLED_STATUSES.has(item.status)).length,
    ltvUsd,
  };
}

export function buildAdminAppointmentDays(
  items: ClientAppointmentListItem[],
  clientDisplayName: string,
): AdminAppointmentDay[] {
  if (!items.length) return [];

  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const byDay = new Map<string, ClientAppointmentListItem[]>();

  for (const row of sorted) {
    const d = new Date(row.startAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(row);
  }

  const keys = [...byDay.keys()].sort();
  return keys.map((key, idx) => {
    const dayRows = byDay.get(key)!;
    const firstStart = new Date(dayRows[0]!.startAt);
    const dateLine = formatDateLine(firstStart);
    const starts = dayRows.map((r) => new Date(r.startAt).getTime());
    const ends = dayRows.map((r) => new Date(r.endAt).getTime());
    const minT = Math.min(...starts);
    const maxT = Math.max(...ends);
    const timeRange = formatTimeRange(new Date(minT), new Date(maxT));
    const sessions = dayRows.map((row) => {
      const serviceName = row.service.name.trim() || "Service";
      const typeLabel = formatAppointmentType(row.appointmentType);
      const title = `${clientDisplayName} — ${serviceName} (${typeLabel}) · ${formatAppointmentStatus(row.status)}`;
      return {
        id: row.appointmentId,
        title,
        providerName: row.therapist.fullName.trim() || "Therapist",
        providerAvatarUrl: row.therapist.profilePhotoUrl ?? null,
      };
    });

    return {
      id: `day-${key}-${idx}`,
      kind: "list" as const,
      dateLine,
      timeRange,
      sessions,
    };
  });
}
