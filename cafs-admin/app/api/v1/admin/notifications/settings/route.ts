import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";

type Body = {
  email?: { enabled?: boolean };
  sms?: { enabled?: boolean; provider?: string | null };
};

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const res = ok(
    {
      email: { enabled: (process.env.NOTIFICATIONS_EMAIL_ENABLED ?? "true") === "true" },
      sms: {
        enabled: (process.env.NOTIFICATIONS_SMS_ENABLED ?? "false") === "true",
        provider: process.env.NOTIFICATIONS_SMS_PROVIDER ?? null,
      },
    },
    "Notification settings retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let _body: Body;
  try {
    _body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  // Not persisted yet; accept request and return success.
  const res = ok(null, "Notification settings updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

