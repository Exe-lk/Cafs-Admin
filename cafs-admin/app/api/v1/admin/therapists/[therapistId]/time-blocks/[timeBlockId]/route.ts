import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ therapistId: string; timeBlockId: string }> },
) {
  const { therapistId, timeBlockId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { error } = await adminSupabase
    .from("therapist_time_blocks")
    .delete()
    .eq("therapist_id", therapistId)
    .eq("time_block_id", timeBlockId);
  if (error) return err(error.message, 400);

  const res = ok(null, "Time block deleted successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

