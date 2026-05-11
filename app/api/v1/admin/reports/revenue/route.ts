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
    .from("payments")
    .select("amount,currency,method,status,paid_at,created_at")
    .gte("created_at", fromD.toISOString())
    .lt("created_at", toD.toISOString())
    .eq("status", "paid");
  if (error) return err(error.message, 400);

  const currency = "LKR";
  const totalRevenue = (data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
  const by = new Map<string, number>();
  for (const p of data ?? []) {
    const m = String(p.method);
    by.set(m, (by.get(m) ?? 0) + Number(p.amount ?? 0));
  }

  const res = ok(
    {
      from: fromD.toISOString(),
      to: toD.toISOString(),
      currency,
      totalRevenue,
      byPaymentMethod: Array.from(by.entries()).map(([method, amount]) => ({
        method,
        amount,
      })),
    },
    "Revenue report generated successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

