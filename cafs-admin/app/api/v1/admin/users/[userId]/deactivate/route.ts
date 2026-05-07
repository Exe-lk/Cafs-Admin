import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const { error } = await adminSupabase
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return err(error.message, 400);

  const res = ok(null, "User deactivated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

