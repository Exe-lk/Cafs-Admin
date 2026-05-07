import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const therapistId = sp.get("therapistId")?.trim() || null;
  const clientId = sp.get("clientId")?.trim() || null;
  const fromD = parseIsoDateParam(sp.get("from"));
  const toD = parseIsoDateParam(sp.get("to"));

  const adminSupabase = createSupabaseServiceRoleClient();
  let q = adminSupabase
    .from("appointments")
    .select(
      "appointment_id,therapist_id,start_at,end_at,appointment_type,status",
    )
    .order("start_at", { ascending: true });

  if (therapistId) q = q.eq("therapist_id", therapistId);
  if (clientId) q = q.eq("client_id", clientId);
  if (fromD) q = q.gte("start_at", fromD.toISOString());
  if (toD) q = q.lt("start_at", toD.toISOString());

  const { data, error } = await q;
  if (error) return err(error.message, 400);

  const res = ok(
    {
      items: (data ?? []).map((a: any) => ({
        therapistId: a.therapist_id,
        type: "appointment" as const,
        appointmentId: a.appointment_id,
        startAt: a.start_at,
        endAt: a.end_at,
        appointmentType: a.appointment_type,
        status: a.status,
      })),
    },
    "Team calendar retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

