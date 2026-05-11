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

  const adminSupabase = createSupabaseServiceRoleClient();
  const sp = request.nextUrl.searchParams;
  const fromD = parseIsoDateParam(sp.get("from"));
  const toD = parseIsoDateParam(sp.get("to"));
  if (!fromD || !toD || !(toD > fromD)) return err("Invalid from/to", 400);

  // Config defaults (until `/admin/system/config` is backed by a table).
  const maxInPersonRooms = Number(process.env.MAX_IN_PERSON_ROOMS ?? "4");
  const intervalMinutes = Number(process.env.ROOM_AVAILABILITY_INTERVAL_MINUTES ?? "60");

  // Count existing in-person appointments per interval.
  const { data: appts, error } = await adminSupabase
    .from("appointments")
    .select("start_at,end_at,appointment_type,status")
    .gte("start_at", fromD.toISOString())
    .lt("start_at", toD.toISOString())
    .eq("appointment_type", "in_person")
    .not("status", "in", "(cancelled,expired)");
  if (error) return err(error.message, 400);

  const buckets = new Map<string, number>();
  for (const a of appts ?? []) {
    const key = new Date(a.start_at as string).toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const items = [];
  for (
    let t = new Date(fromD.getTime());
    t < toD;
    t = new Date(t.getTime() + intervalMinutes * 60_000)
  ) {
    const key = t.toISOString();
    const count = buckets.get(key) ?? 0;
    items.push({
      startAt: key,
      endAt: new Date(t.getTime() + intervalMinutes * 60_000).toISOString(),
      inPersonBookingsCount: count,
      roomsAvailable: Math.max(0, maxInPersonRooms - count),
    });
  }

  const res = ok(
    {
      from: fromD.toISOString(),
      to: toD.toISOString(),
      maxInPersonRooms,
      intervalMinutes,
      items,
    },
    "Room availability retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

