import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseIntParam, rangeFromPageLimit } from "@/lib/api/http";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CreateBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  note?: string;
};

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
  const qText = sp.get("q")?.trim() || null;
  const page = parseIntParam(sp.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parseIntParam(sp.get("limit"), 10, { min: 1, max: 100 });
  const { from, to, page: safePage, limit: safeLimit } = rangeFromPageLimit(
    page,
    limit,
  );

  let q = adminSupabase
    .from("profiles")
    .select("user_id,role,full_name,email,phone,is_active", { count: "exact" })
    .eq("role", "client")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (qText) {
    q = q.or(
      [`full_name.ilike.%${qText}%`, `email.ilike.%${qText}%`, `phone.ilike.%${qText}%`].join(
        ",",
      ),
    );
  }

  const { data, error, count } = await q;
  if (error) return err(error.message, 400);

  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

  const res = ok(
    {
      items: (data ?? []).map((p: any) => ({
        clientId: p.user_id,
        fullName: p.full_name,
        email: p.email,
        phone: p.phone,
        isActive: p.is_active,
      })),
      pagination: { totalItems, page: safePage, limit: safeLimit, totalPages },
    },
    "Clients retrieved successfully",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return err("Invalid JSON body", 400);
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  if (!fullName) return err("Validation error", 400, [{ field: "fullName", message: "Required" }]);

  const now = new Date().toISOString();
  const clientId = newUuid();

  const { error } = await adminSupabase.from("profiles").insert({
    user_id: clientId,
    role: "client",
    full_name: fullName,
    email,
    phone,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  await adminSupabase.from("client_profiles").insert({
    client_id: clientId,
    created_at: now,
    updated_at: now,
  });

  const res = created({ clientId }, "Client record created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

