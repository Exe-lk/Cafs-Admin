"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import CustomerProfileFormFields from "@/components/admin/CustomerProfileFormFields";
import type { AdminCustomerProfile } from "@/components/admin/EditCustomerModal";
import {
  type CustomerFormFieldErrors,
  type CustomerFormFieldKey,
  type CustomerFormFields,
  isCustomerFormValid,
  validateCustomerForm,
  validateCustomerFormField,
} from "@/lib/admin/customerFormValidation";

const EMPTY_PROFILE: AdminCustomerProfile = {
  id: "",
  fullName: "",
  phone: "",
  email: "",
  company: "",
  address: "",
  country: "Sri Lanka",
  avatarUrl: null,
};

function toFormFields(draft: AdminCustomerProfile): CustomerFormFields {
  return {
    fullName: draft.fullName,
    phone: draft.phone,
    email: draft.email,
    company: draft.company,
    address: draft.address,
    country: draft.country,
  };
}

export default function CreateCustomerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: Omit<AdminCustomerProfile, "id">) => void;
}) {
  const [draft, setDraft] = useState<AdminCustomerProfile>(EMPTY_PROFILE);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormFieldErrors>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const formFields = useMemo(() => toFormFields(draft), [draft]);

  const canCreate = useMemo(() => isCustomerFormValid(formFields), [formFields]);

  const handleFieldBlur = useCallback(
    (field: CustomerFormFieldKey) => {
      const message = validateCustomerFormField(field, formFields);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (message) next[field] = message;
        else delete next[field];
        return next;
      });
    },
    [formFields],
  );

  const handleChange = useCallback((patch: Partial<CustomerFormFields>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as CustomerFormFieldKey[]) {
        delete next[key];
      }
      return next;
    });
  }, []);

  function submit() {
    const errors = validateCustomerForm(formFields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const { id, ...rest } = draft;
    void id;
    onCreate({
      ...rest,
      fullName: rest.fullName.trim(),
      phone: rest.phone.trim(),
      email: rest.email.trim(),
      company: rest.company.trim(),
      address: rest.address.trim(),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mgmt-inverse-surface/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create customer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-mgmt-surface-container-lowest shadow-2xl max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-mgmt-surface-container px-8 py-6">
          <h2 className="text-xl font-bold tracking-tight text-mgmt-on-surface">Create customer</h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-mgmt-surface-container"
            onClick={onClose}
            aria-label="Close"
          >
            <MaterialSymbol name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8">
          <div className="mb-10 flex items-center gap-6">
            <div className="group relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-mgmt-surface-container-low text-mgmt-on-surface-variant">
                <MaterialSymbol name="person" className="text-3xl" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-bold text-mgmt-on-surface">
                {draft.fullName.trim() || "New customer"}
              </h3>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">Add customer details</p>
            </div>
          </div>

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <CustomerProfileFormFields
              draft={formFields}
              fieldErrors={fieldErrors}
              onChange={handleChange}
              onBlur={handleFieldBlur}
              autoFocus
            />
          </form>
        </div>

        <div className="flex items-center justify-end gap-4 bg-mgmt-surface-container-low px-8 py-6">
          <button
            type="button"
            className="px-6 py-2 text-sm font-semibold text-mgmt-on-surface-variant transition-colors hover:text-mgmt-on-surface"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-gradient-to-br from-mgmt-primary to-mgmt-primary-dim px-8 py-3 text-sm font-bold text-mgmt-on-primary shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            disabled={!canCreate}
            onClick={submit}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
