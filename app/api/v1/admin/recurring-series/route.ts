import type { NextRequest } from "next/server";
import { created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Body = {
  clientId?: string;
  therapistId?: string;
  serviceId?: string;
  appointmentType?: "online" | "in_person";
  rruleText?: string;
  startAt?: string;
  durationMinutes?: number;
};

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const therapistId =
    typeof body.therapistId === "string" ? body.therapistId.trim() : "";
  const serviceId =
    typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  const appointmentType = body.appointmentType;
  const rruleText = typeof body.rruleText === "string" ? body.rruleText : "";
  const startD = parseIsoDateParam(typeof body.startAt === "string" ? body.startAt : null);
  const durationMinutes =
    typeof body.durationMinutes === "number" && body.durationMinutes > 0
      ? Math.floor(body.durationMinutes)
      : 60;

  if (!clientId || !therapistId || !serviceId || !appointmentType || !rruleText || !startD) {
    return err("Validation error", 400);
  }

  const now = new Date().toISOString();
  const seriesId = newUuid();

  const { error } = await adminSupabase.from("recurring_series").insert({
    series_id: seriesId,
    created_by: auth.ctx.user.id,
    client_id: clientId,
    therapist_id: therapistId,
    service_id: serviceId,
    appointment_type: appointmentType,
    rrule_text: rruleText,
    start_at: startD.toISOString(),
    duration_minutes: durationMinutes,
    is_active: true,
    created_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ seriesId }, "Recurring series created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

