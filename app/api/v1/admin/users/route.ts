import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { parseBoolParam, parseIntParam, rangeFromPageLimit } from "@/lib/api/http";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CreateBody = {
  email?: string;
  fullName?: string;
  phone?: string;
  role?: "admin" | "therapist" | "front_office" | "client";
  temporaryPassword?: string;
  isActive?: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();
  const sp = request.nextUrl.searchParams;
  const role = sp.get("role")?.trim() || null;
  const isActive = parseBoolParam(sp.get("isActive"));
  const qText = sp.get("q")?.trim() || null;
  const page = parseIntParam(sp.get("page"), 1, { min: 1, max: 10_000 });
  const limit = parseIntParam(sp.get("limit"), 10, { min: 1, max: 100 });
  const { from, to, page: safePage, limit: safeLimit } = rangeFromPageLimit(
    page,
    limit,
  );

  let q = adminSupabase
    .from("profiles")
    .select("user_id,role,full_name,email,phone,is_active,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (role) q = q.eq("role", role);
  if (isActive !== null) q = q.eq("is_active", isActive);
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
      items: data ?? [],
      pagination: { totalItems, page: safePage, limit: safeLimit, totalPages },
    },
    "Users retrieved successfully",
  );
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

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  const role =
    body.role === "admin" ||
    body.role === "therapist" ||
    body.role === "front_office" ||
    body.role === "client"
      ? body.role
      : null;
  if (!fullName || !role) return err("Validation error", 400);

  // NOTE: Creating actual Supabase Auth users requires service-role and admin API.
  // Here we only create app-level profile records (works for internal staff directory).
  const now = new Date().toISOString();
  const userId = newUuid();

  const { error } = await adminSupabase.from("profiles").insert({
    user_id: userId,
    role,
    full_name: fullName,
    email: email || null,
    phone,
    is_active: typeof body.isActive === "boolean" ? body.isActive : true,
    created_at: now,
    updated_at: now,
  });
  if (error) return err(error.message, 400);

  const res = created({ userId }, "User account created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

