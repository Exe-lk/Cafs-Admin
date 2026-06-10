import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAppointmentPendingPaymentEmailContent,
  getPaymentInstructionsFromEnv,
} from "@/lib/email/appointment-pending-payment";

const baseInput = {
  to: "client@example.com",
  clientName: "Jane Doe",
  therapistName: "Dr. Smith",
  serviceName: "Individual Therapy",
  startAt: "2026-06-12T10:30:00.000Z",
  endAt: "2026-06-12T11:30:00.000Z",
  appointmentType: "online" as const,
  timeZone: "Asia/Colombo",
  paymentDueAt: "2026-06-13T10:30:00.000Z",
  amountLkr: "4,500",
  paymentInstructionsText: "HNB Bambalapitiya\nAC: 039010222122",
  paymentWhatsappNumber: "+94764067004",
};

describe("buildAppointmentPendingPaymentEmailContent", () => {
  it("uses the pending-payment subject line", () => {
    const { subject } = buildAppointmentPendingPaymentEmailContent(baseInput);
    expect(subject).toBe("Your appointment is booked — payment pending");
  });

  it("includes client greeting and payment-required callout", () => {
    const { html, text } = buildAppointmentPendingPaymentEmailContent(baseInput);

    expect(html).toContain("Hi Jane Doe");
    expect(html).toContain("Payment is required to confirm your slot");
    expect(text).toContain("Hi Jane Doe");
    expect(text).toContain("Payment is required to confirm your slot");
  });

  it("includes appointment details and payment instructions", () => {
    const { html, text } = buildAppointmentPendingPaymentEmailContent(baseInput);

    expect(html).toContain("Individual Therapy");
    expect(html).toContain("Dr. Smith");
    expect(html).toContain("Rs 4,500");
    expect(html).toContain("HNB Bambalapitiya");
    expect(html).toContain("+94764067004");
    expect(text).toContain("Service: Individual Therapy");
    expect(text).toContain("Therapist: Dr. Smith");
    expect(text).toContain("Amount: Rs 4,500");
    expect(text).toContain("HNB Bambalapitiya");
    expect(text).toContain("WhatsApp to +94764067004");
  });

  it("labels in-person appointments correctly", () => {
    const { html, text } = buildAppointmentPendingPaymentEmailContent({
      ...baseInput,
      appointmentType: "in_person",
    });

    expect(html).toContain("In-person");
    expect(text).toContain("Type: In-person");
  });

  it("escapes HTML in user-provided fields", () => {
    const { html } = buildAppointmentPendingPaymentEmailContent({
      ...baseInput,
      clientName: "<script>alert(1)</script>",
      serviceName: "Therapy & Wellness",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Therapy &amp; Wellness");
  });

  it("omits optional sections when values are missing", () => {
    const { html, text } = buildAppointmentPendingPaymentEmailContent({
      ...baseInput,
      therapistName: null,
      serviceName: null,
      amountLkr: null,
      paymentInstructionsText: null,
      paymentWhatsappNumber: null,
    });

    expect(html).not.toContain("Therapist:");
    expect(html).not.toContain("Service:");
    expect(html).not.toContain("Amount:");
    expect(html).not.toContain("WhatsApp");
    expect(text).not.toContain("Therapist:");
    expect(text).not.toContain("Service:");
    expect(text).not.toContain("Amount:");
    expect(text).not.toContain("WhatsApp");
  });
});

describe("getPaymentInstructionsFromEnv", () => {
  const originalInstructions = process.env.PAYMENT_INSTRUCTIONS_TEXT;
  const originalWhatsapp = process.env.PAYMENT_WHATSAPP_NUMBER;

  afterEach(() => {
    if (originalInstructions === undefined) {
      delete process.env.PAYMENT_INSTRUCTIONS_TEXT;
    } else {
      process.env.PAYMENT_INSTRUCTIONS_TEXT = originalInstructions;
    }
    if (originalWhatsapp === undefined) {
      delete process.env.PAYMENT_WHATSAPP_NUMBER;
    } else {
      process.env.PAYMENT_WHATSAPP_NUMBER = originalWhatsapp;
    }
  });

  it("reads payment instructions from environment variables", () => {
    process.env.PAYMENT_INSTRUCTIONS_TEXT = "  Bank details here  ";
    process.env.PAYMENT_WHATSAPP_NUMBER = " +94760000000 ";

    expect(getPaymentInstructionsFromEnv()).toEqual({
      paymentInstructionsText: "Bank details here",
      paymentWhatsappNumber: "+94760000000",
    });
  });

  it("returns null when env vars are unset or blank", () => {
    delete process.env.PAYMENT_INSTRUCTIONS_TEXT;
    delete process.env.PAYMENT_WHATSAPP_NUMBER;

    expect(getPaymentInstructionsFromEnv()).toEqual({
      paymentInstructionsText: null,
      paymentWhatsappNumber: null,
    });
  });
});
