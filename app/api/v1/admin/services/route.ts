import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CreateBody = {
  name?: string;
  description?: string;
  visibility?: "public" | "private";
  defaultDurationMinutes?: number;
  basePriceLkr?: number;
  currency?: string;
  allowedAppointmentType?: "online" | "in_person" | null;
  isActive?: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { data, error } = await adminSupabase
    .from("services")
    .select(
      "service_id,name,description,visibility,default_duration_minutes,base_price_lkr,currency,allowed_appointment_type,is_active,created_at,updated_at",
    )
    .order("created_at", { ascending: false });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Services retrieved successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return err("Validation error", 400, [{ field: "name", message: "Required" }]);

  const now = new Date().toISOString();
  const serviceId = newUuid();

  const { error } = await adminSupabase.from("services").insert({
    service_id: serviceId,
    name,
    description: typeof body.description === "string" ? body.description : null,
    visibility: body.visibility ?? "public",
    default_duration_minutes:
      typeof body.defaultDurationMinutes === "number"
        ? Math.floor(body.defaultDurationMinutes)
        : 60,
    base_price_lkr:
      typeof body.basePriceLkr === "number" ? body.basePriceLkr : null,
    currency: typeof body.currency === "string" ? body.currency : "LKR",
    allowed_appointment_type:
      body.allowedAppointmentType === null ||
      body.allowedAppointmentType === "online" ||
      body.allowedAppointmentType === "in_person"
        ? body.allowedAppointmentType
        : null,
    is_active: typeof body.isActive === "boolean" ? body.isActive : true,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ serviceId }, "Service created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

