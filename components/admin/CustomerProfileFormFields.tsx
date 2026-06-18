"use client";

import MaterialSymbol from "@/components/admin/MaterialSymbol";
import {
  CUSTOMER_ADDRESS_MAX_LEN,
  CUSTOMER_COMPANY_MAX_LEN,
  CUSTOMER_COUNTRIES,
  CUSTOMER_EMAIL_MAX_LEN,
  CUSTOMER_FULL_NAME_MAX_LEN,
  CUSTOMER_PHONE_MAX_LEN,
  type CustomerFormFieldErrors,
  type CustomerFormFieldKey,
  type CustomerFormFields,
  sanitizePhoneInput,
} from "@/lib/admin/customerFormValidation";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const inputClass =
  "w-full rounded-xl border-none bg-mgmt-surface-container-low px-4 py-3 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none";

const labelClass =
  "ml-1 block text-[0.75rem] font-semibold uppercase tracking-wider text-mgmt-on-surface-variant";

const fieldHintClass = "text-xs text-mgmt-on-surface-variant";

const fieldErrorClass = "text-xs text-red-600";

type Props = {
  draft: CustomerFormFields;
  fieldErrors: CustomerFormFieldErrors;
  onChange: (patch: Partial<CustomerFormFields>) => void;
  onBlur: (field: CustomerFormFieldKey) => void;
  autoFocus?: boolean;
};

export default function CustomerProfileFormFields({
  draft,
  fieldErrors,
  onChange,
  onBlur,
  autoFocus = false,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelClass}>Full name</label>
          <input
            className={inputClass}
            type="text"
            value={draft.fullName}
            maxLength={CUSTOMER_FULL_NAME_MAX_LEN}
            aria-invalid={Boolean(fieldErrors.fullName)}
            autoFocus={autoFocus}
            onChange={(e) => onChange({ fullName: e.target.value })}
            onBlur={() => onBlur("fullName")}
          />
          {fieldErrors.fullName ? (
            <p className={fieldErrorClass}>{fieldErrors.fullName}</p>
          ) : (
            <p className={fieldHintClass}>Up to {CUSTOMER_FULL_NAME_MAX_LEN} characters</p>
          )}
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Primary phone</label>
          <input
            className={inputClass}
            type="tel"
            value={draft.phone}
            maxLength={CUSTOMER_PHONE_MAX_LEN}
            aria-invalid={Boolean(fieldErrors.phone)}
            onChange={(e) => onChange({ phone: sanitizePhoneInput(e.target.value) })}
            onBlur={() => onBlur("phone")}
          />
          {fieldErrors.phone ? (
            <p className={fieldErrorClass}>{fieldErrors.phone}</p>
          ) : (
            <p className={fieldHintClass}>9–15 digits; +, spaces, and dashes allowed</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelClass}>Primary email</label>
          <input
            className={inputClass}
            placeholder="e.g. name@company.com"
            type="email"
            value={draft.email}
            maxLength={CUSTOMER_EMAIL_MAX_LEN}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={() => onBlur("email")}
          />
          {fieldErrors.email ? (
            <p className={fieldErrorClass}>{fieldErrors.email}</p>
          ) : (
            <p className={fieldHintClass}>Optional; up to {CUSTOMER_EMAIL_MAX_LEN} characters</p>
          )}
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Company</label>
          <input
            className={inputClass}
            placeholder="Enter company name"
            type="text"
            value={draft.company}
            maxLength={CUSTOMER_COMPANY_MAX_LEN}
            aria-invalid={Boolean(fieldErrors.company)}
            onChange={(e) => onChange({ company: e.target.value })}
            onBlur={() => onBlur("company")}
          />
          {fieldErrors.company ? (
            <p className={fieldErrorClass}>{fieldErrors.company}</p>
          ) : (
            <p className={fieldHintClass}>Optional; up to {CUSTOMER_COMPANY_MAX_LEN} characters</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Address</label>
        <textarea
          className={cx(inputClass, "resize-none")}
          placeholder="Street address, apartment, suite, etc."
          rows={2}
          value={draft.address}
          maxLength={CUSTOMER_ADDRESS_MAX_LEN}
          aria-invalid={Boolean(fieldErrors.address)}
          onChange={(e) => onChange({ address: e.target.value })}
          onBlur={() => onBlur("address")}
        />
        {fieldErrors.address ? (
          <p className={fieldErrorClass}>{fieldErrors.address}</p>
        ) : (
          <p className={fieldHintClass}>
            Optional; {draft.address.length}/{CUSTOMER_ADDRESS_MAX_LEN} characters
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Country</label>
        <div className="relative">
          <select
            className={cx(
              inputClass,
              "appearance-none",
              fieldErrors.country && "ring-1 ring-red-500/50",
            )}
            value={draft.country}
            aria-invalid={Boolean(fieldErrors.country)}
            onChange={(e) => onChange({ country: e.target.value })}
            onBlur={() => onBlur("country")}
          >
            {CUSTOMER_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <MaterialSymbol
            name="expand_more"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mgmt-on-surface-variant"
          />
        </div>
        {fieldErrors.country ? <p className={fieldErrorClass}>{fieldErrors.country}</p> : null}
      </div>
    </div>
  );
}
