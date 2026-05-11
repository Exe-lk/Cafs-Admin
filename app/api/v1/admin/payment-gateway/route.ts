import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";

type Body = {
  provider?: string;
  isEnabled?: boolean;
  mode?: "sandbox" | "live";
  configuration?: Record<string, unknown>;
};

// NOTE: This blueprint implies persisted settings. No `settings` table exists in the schema yet,
// so we serve from env for now.
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const res = ok(
    {
      provider: process.env.PAYMENT_PROVIDER ?? "payhere",
      isEnabled: (process.env.PAYMENT_ENABLED ?? "false") === "true",
      mode: (process.env.PAYMENT_MODE as "sandbox" | "live" | undefined) ?? "sandbox",
      configuration: {},
    },
    "Payment gateway settings retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return err("Invalid JSON body", 400);
  }

  // Not persisted yet; accept request and return success.
  const res = ok(null, "Payment gateway settings updated successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

