import type { NextRequest } from "next/server";
import { created, err } from "@/lib/api/envelope";
import { getAuthContext, requireRoleService } from "@/lib/api/auth";
import { newUuid } from "@/lib/api/ids";
import { AUDIT_ENTITY_APPOINTMENT, writeAuditLog } from "@/lib/audit/writeAuditLog";
import {
  buildBankSlipObjectPath,
  getBankSlipStorageBucket,
  inferBankSlipExtension,
  validateBankSlipFile,
} from "@/lib/payments/bankSlipUpload";
import { resolveAppointmentAmountLkr } from "@/lib/payments/resolveAppointmentAmount";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const UPLOADABLE_STATUSES = new Set(["pending_payment", "pending_confirmation"]);

type Body = {
  bankReference?: string;
  bankSlipUrl?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;
  const auth = await getAuthContext(request);
  if (!auth.ok) return err("Unauthorized", 401);
  const roleCheck = await requireRoleService(auth.ctx.user.id, [
    "admin",
    "front_office",
  ]);
  if (!roleCheck.ok) return err("Forbidden", 403);

  const adminSupabase = createSupabaseServiceRoleClient();

  let body: Body = {};
  let uploadedSlipUrl = "";
  let uploadedSlipPath = "";
  let uploadedSlipBucket = "";

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const bankReferenceForm = form.get("bankReference");
      const bankSlipUrlForm = form.get("bankSlipUrl");
      const bankSlipFile = form.get("bankSlipFile");

      body.bankReference =
        typeof bankReferenceForm === "string" ? bankReferenceForm : undefined;
      body.bankSlipUrl =
        typeof bankSlipUrlForm === "string" ? bankSlipUrlForm : undefined;

      if (bankSlipFile instanceof File && bankSlipFile.size > 0) {
        const fileError = validateBankSlipFile(bankSlipFile);
        if (fileError) {
          return err("Validation error", 400, [
            { field: "bankSlipFile", message: fileError },
          ]);
        }

        const bucket = getBankSlipStorageBucket();
        const ext = inferBankSlipExtension(bankSlipFile);
        const objectPath = buildBankSlipObjectPath(appointmentId, ext);
        const fileBuffer = await bankSlipFile.arrayBuffer();
        const { error: uploadErr } = await adminSupabase.storage
          .from(bucket)
          .upload(objectPath, fileBuffer, {
            contentType: bankSlipFile.type,
            upsert: false,
          });
        if (uploadErr) {
          return err(`Bank slip upload failed: ${uploadErr.message}`, 400);
        }
        uploadedSlipBucket = bucket;
        uploadedSlipPath = objectPath;
        const { data: publicUrlData } = adminSupabase.storage
          .from(bucket)
          .getPublicUrl(objectPath);
        uploadedSlipUrl = publicUrlData?.publicUrl || "";
      }
    } else {
      body = (await request.json()) as Body;
    }
  } catch {
    return err("Invalid request body", 400);
  }

  const bankReference =
    typeof body.bankReference === "string" ? body.bankReference.trim() : "";
  const bankSlipUrlRaw =
    typeof body.bankSlipUrl === "string" ? body.bankSlipUrl.trim() : "";
  const bankSlipUrl =
    bankSlipUrlRaw ||
    uploadedSlipUrl ||
    (uploadedSlipPath ? `supabase://${uploadedSlipBucket}/${uploadedSlipPath}` : "");

  if (!bankReference || !bankSlipUrl) {
    return err("Validation error", 400, [
      ...(bankReference ? [] : [{ field: "bankReference", message: "Required" }]),
      ...(bankSlipUrl
        ? []
        : [{ field: "bankSlipUrl", message: "Required (or upload a slip file)" }]),
    ]);
  }

  const { data: appt, error: apptErr } = await adminSupabase
    .from("appointments")
    .select("appointment_id,client_id,status,therapist_id,service_id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (apptErr) return err(apptErr.message, 400);
  if (!appt) return err("Not found", 404);

  if (!UPLOADABLE_STATUSES.has(String(appt.status))) {
    return err("Bank slip upload is not allowed for this appointment status.", 400);
  }

  const now = new Date().toISOString();
  const amount = await resolveAppointmentAmountLkr(adminSupabase, {
    therapistId: String(appt.therapist_id),
    serviceId: String(appt.service_id),
  });
  if (amount == null) {
    return err("Unable to determine amount for payment", 400);
  }

  const providerPayload = JSON.stringify({
    bankReference,
    bankSlipUrl,
    ...(uploadedSlipPath ? { bankSlipStoragePath: uploadedSlipPath } : {}),
    ...(uploadedSlipBucket ? { bankSlipStorageBucket: uploadedSlipBucket } : {}),
  });

  const { data: existingPayment, error: existingPaymentErr } = await adminSupabase
    .from("payments")
    .select("payment_id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (existingPaymentErr) return err(existingPaymentErr.message, 400);

  const paymentId = existingPayment?.payment_id ?? newUuid();

  const payMutation = existingPayment
    ? adminSupabase
        .from("payments")
        .update({
          method: "bank_transfer",
          status: "pending",
          amount,
          currency: "LKR",
          provider_payload: providerPayload,
          updated_at: now,
        })
        .eq("payment_id", paymentId)
    : adminSupabase.from("payments").insert({
        payment_id: paymentId,
        appointment_id: appointmentId,
        method: "bank_transfer",
        status: "pending",
        amount,
        currency: "LKR",
        provider_payload: providerPayload,
        created_at: now,
        updated_at: now,
      });
  const { error: payErr } = await payMutation;
  if (payErr) return err(payErr.message, 400);

  const { error: apptUpErr } = await adminSupabase
    .from("appointments")
    .update({
      status: "pending_confirmation",
      updated_at: now,
    })
    .eq("appointment_id", appointmentId);
  if (apptUpErr) return err(apptUpErr.message, 400);

  await writeAuditLog(adminSupabase, {
    actorUserId: auth.ctx.user.id,
    action: "bank_slip_submitted",
    entity: AUDIT_ENTITY_APPOINTMENT,
    entityId: appointmentId,
    metadata: {
      clientId: String(appt.client_id),
      status: "pending_confirmation",
      bankReference,
      ...(uploadedSlipPath ? { bankSlipStoragePath: uploadedSlipPath } : {}),
    },
  });

  const res = created(
    {
      paymentId,
      status: "pending",
      appointmentStatus: "pending_confirmation",
      amount,
      currency: "LKR",
    },
    "Bank transfer submitted. Pending confirmation.",
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
