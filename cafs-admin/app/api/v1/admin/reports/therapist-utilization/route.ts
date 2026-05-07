import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIsoDateParam } from "@/lib/api/http";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const sp = request.nextUrl.searchParams;
  const fromD = parseIsoDateParam(sp.get("from"));
  const toD = parseIsoDateParam(sp.get("to"));
  if (!fromD || !toD || !(toD > fromD)) return err("Invalid from/to", 400);

  const { data, error } = await adminSupabase
    .from("appointments")
    .select("therapist_id,status,created_at")
    .gte("created_at", fromD.toISOString())
    .lt("created_at", toD.toISOString());
  if (error) return err(error.message, 400);

  const map = new Map<
    string,
    { totalAppointments: number; completed: number; cancelled: number; noShow: number }
  >();

  for (const a of data ?? []) {
    const id = String(a.therapist_id);
    const st = String(a.status);
    const cur =
      map.get(id) ?? { totalAppointments: 0, completed: 0, cancelled: 0, noShow: 0 };
    cur.totalAppointments += 1;
    if (st === "completed") cur.completed += 1;
    if (st === "cancelled") cur.cancelled += 1;
    if (st === "no_show") cur.noShow += 1;
    map.set(id, cur);
  }

  const res = ok(
    {
      items: Array.from(map.entries()).map(([therapistId, v]) => ({
        therapistId,
        ...v,
      })),
    },
    "Therapist utilization report generated successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

