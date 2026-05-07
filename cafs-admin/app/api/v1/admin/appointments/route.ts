import type { NextRequest } from "next/server";
import { created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Body = {
  client?: { clientId?: string };
  therapistId?: string;
  serviceId?: string;
  appointmentType?: "online" | "in_person";
  startAt?: string;
  endAt?: string;
  payment?: { method?: "cash" | "gateway" | "bank_transfer"; markAsPaid?: boolean };
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

  const clientId =
    typeof body.client?.clientId === "string" ? body.client.clientId.trim() : "";
  const therapistId =
    typeof body.therapistId === "string" ? body.therapistId.trim() : "";
  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  const appointmentType = body.appointmentType;

  const startD = parseIsoDateParam(typeof body.startAt === "string" ? body.startAt : null);
  const endD = parseIsoDateParam(typeof body.endAt === "string" ? body.endAt : null);

  if (!clientId || !therapistId || !serviceId || !appointmentType || !startD || !endD) {
    return err("Validation error", 400);
  }
  if (!(endD > startD)) return err("Invalid startAt/endAt", 400);

  const now = new Date().toISOString();
  const appointmentId = newUuid();

  const { error } = await adminSupabase.from("appointments").insert({
    appointment_id: appointmentId,
    client_id: clientId,
    therapist_id: therapistId,
    service_id: serviceId,
    appointment_type: appointmentType,
    status: "pending_payment",
    start_at: startD.toISOString(),
    end_at: endD.toISOString(),
    created_by: auth.ctx.user.id,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created(
    { appointmentId, status: "pending_payment" },
    "Appointment created successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

