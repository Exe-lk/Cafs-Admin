import type { NextRequest } from "next/server";
import { ok, created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const SELECT_COLUMNS =
  "therapist_service_id,therapist_id,service_id,price_lkr,duration_minutes,is_active,created_at";

const SELECT_WITH_SERVICE =
  `${SELECT_COLUMNS}, service:services!therapist_services_service_id_fkey(service_id,name,description)`;

const DUPLICATE_THERAPIST_SERVICE_MESSAGE =
  "This therapist already offers this service category.";

function resolveServiceCategoryId(searchParams: URLSearchParams): string | null {
  const serviceId = searchParams.get("serviceId")?.trim() || null;
  const categoryId =
    searchParams.get("categoryId")?.trim() ||
    searchParams.get("category")?.trim() ||
    null;
  if (serviceId && categoryId && serviceId !== categoryId) return null;
  return serviceId ?? categoryId;
}

type CreateBody = {
  therapistId?: string;
  serviceId?: string;
  priceLkr?: number | null;
  durationMinutes?: number | null;
  isActive?: boolean;
};

function buildTherapistServiceValues(body: CreateBody) {
  return {
    price_lkr: typeof body.priceLkr === "number" ? body.priceLkr : null,
    duration_minutes:
      typeof body.durationMinutes === "number"
        ? Math.max(5, Math.floor(body.durationMinutes))
        : null,
    is_active: typeof body.isActive === "boolean" ? body.isActive : true,
  };
}

function isTherapistServiceUniqueViolation(message: string): boolean {
  return message.includes("therapist_services_therapist_id_service_id_key");
}

async function reactivateInactiveTherapistService(
  adminSupabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  therapistId: string,
  serviceId: string,
  body: CreateBody,
) {
  const { data: existing, error: existingErr } = await adminSupabase
    .from("therapist_services")
    .select("therapist_service_id,is_active")
    .eq("therapist_id", therapistId)
    .eq("service_id", serviceId)
    .maybeSingle();
  if (existingErr) return { error: existingErr.message as string };
  if (!existing) return { notFound: true as const };
  if (existing.is_active) {
    return {
      conflict: true as const,
      message: DUPLICATE_THERAPIST_SERVICE_MESSAGE,
    };
  }

  const { data: updated, error: updateErr } = await adminSupabase
    .from("therapist_services")
    .update(buildTherapistServiceValues(body))
    .eq("therapist_service_id", existing.therapist_service_id)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (updateErr) return { error: updateErr.message as string };
  if (!updated) return { error: "Therapist service not found" as const };

  return {
    therapistServiceId: String(existing.therapist_service_id),
    reactivated: true as const,
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, ["admin"]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const therapistId = sp.get("therapistId")?.trim() || null;
  const serviceCategoryId = resolveServiceCategoryId(sp);
  if (
    sp.get("serviceId")?.trim() &&
    (sp.get("categoryId")?.trim() || sp.get("category")?.trim()) &&
    !serviceCategoryId
  ) {
    return err("Validation error", 400, [
      { field: "categoryId", message: "Must match serviceId when both are provided" },
    ]);
  }
  const isActiveParam = sp.get("isActive");
  const includeService = sp.get("includeService") === "true";

  const adminSupabase = createSupabaseServiceRoleClient();
  let query = adminSupabase
    .from("therapist_services")
    .select(includeService ? SELECT_WITH_SERVICE : SELECT_COLUMNS);

  if (therapistId) query = query.eq("therapist_id", therapistId);
  if (serviceCategoryId) query = query.eq("service_id", serviceCategoryId);
  if (isActiveParam === "true") query = query.eq("is_active", true);
  if (isActiveParam === "false") query = query.eq("is_active", false);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return err(error.message, 400);

  const res = ok({ items: data ?? [] }, "Therapist services retrieved successfully");
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

  const therapistId = typeof body.therapistId === "string" ? body.therapistId.trim() : "";
  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  if (!therapistId) {
    return err("Validation error", 400, [{ field: "therapistId", message: "Required" }]);
  }
  if (!serviceId) {
    return err("Validation error", 400, [{ field: "serviceId", message: "Required" }]);
  }

  const reactivateResult = await reactivateInactiveTherapistService(
    adminSupabase,
    therapistId,
    serviceId,
    body,
  );
  if ("error" in reactivateResult && reactivateResult.error) {
    return err(reactivateResult.error, 400);
  }
  if ("conflict" in reactivateResult && reactivateResult.conflict) {
    return err(DUPLICATE_THERAPIST_SERVICE_MESSAGE, 409, [
      { field: "serviceId", message: DUPLICATE_THERAPIST_SERVICE_MESSAGE },
    ]);
  }
  if ("therapistServiceId" in reactivateResult && reactivateResult.reactivated) {
    const res = created(
      { therapistServiceId: reactivateResult.therapistServiceId, reactivated: true },
      "Therapist service restored successfully",
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  const therapistServiceId = newUuid();
  const now = new Date().toISOString();

  const { error } = await adminSupabase.from("therapist_services").insert({
    therapist_service_id: therapistServiceId,
    therapist_id: therapistId,
    service_id: serviceId,
    ...buildTherapistServiceValues(body),
    created_at: now,
  });
  if (error) {
    if (isTherapistServiceUniqueViolation(error.message)) {
      const retry = await reactivateInactiveTherapistService(
        adminSupabase,
        therapistId,
        serviceId,
        body,
      );
      if ("therapistServiceId" in retry && retry.reactivated) {
        const res = created(
          { therapistServiceId: retry.therapistServiceId, reactivated: true },
          "Therapist service restored successfully",
        );
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
      if ("conflict" in retry && retry.conflict) {
        return err(DUPLICATE_THERAPIST_SERVICE_MESSAGE, 409, [
          { field: "serviceId", message: DUPLICATE_THERAPIST_SERVICE_MESSAGE },
        ]);
      }
      if ("error" in retry && retry.error) {
        return err(retry.error, 400);
      }
    }
    return err(error.message, 400);
  }

  const res = created({ therapistServiceId }, "Therapist service created successfully");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
