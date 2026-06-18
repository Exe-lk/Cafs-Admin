"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import ConfirmationModal from "@/components/admin/ConfirmationModal";
import CustomerProfileFormFields from "@/components/admin/CustomerProfileFormFields";
import ProfileAvatarUpload from "@/components/admin/ProfileAvatarUpload";
import {
  type CustomerFormFieldErrors,
  type CustomerFormFieldKey,
  type CustomerFormFields,
  isCustomerFormValid,
  validateCustomerForm,
  validateCustomerFormField,
} from "@/lib/admin/customerFormValidation";

export type AdminCustomerProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  country: string;
  avatarUrl?: string | null;
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

export default function EditCustomerModal({
  customer,
  onClose,
  onSave,
  onDelete,
}: {
  customer: AdminCustomerProfile;
  onClose: () => void;
  onSave: (next: AdminCustomerProfile) => void;
  onDelete?: (customerId: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<AdminCustomerProfile>(customer);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormFieldErrors>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const formFields = useMemo(() => toFormFields(draft), [draft]);

  const canSave = useMemo(() => isCustomerFormValid(formFields), [formFields]);

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

    onSave({
      ...draft,
      fullName: draft.fullName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      company: draft.company.trim(),
      address: draft.address.trim(),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mgmt-inverse-surface/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit customer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-mgmt-surface-container-lowest shadow-2xl max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-mgmt-surface-container px-8 py-6">
          <h2 className="text-xl font-bold tracking-tight text-mgmt-on-surface">Edit customer</h2>
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
            <ProfileAvatarUpload
              imageUrl={draft.avatarUrl}
              alt={draft.fullName || "Customer"}
              onImageChange={(avatarUrl) => {
                setDraft((prev) => ({ ...prev, avatarUrl }));
              }}
            />
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-bold text-mgmt-on-surface">{draft.fullName}</h3>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">
                Update profile photo and customer details
              </p>
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

        <div className="flex flex-wrap items-center justify-between gap-4 bg-mgmt-surface-container-low px-8 py-6">
          <div>
            {onDelete ? (
              <button
                type="button"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-400"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteConfirmOpen(true);
                }}
              >
                Delete customer
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-4">
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
              disabled={!canSave}
              onClick={submit}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {deleteConfirmOpen && onDelete ? (
        <ConfirmationModal
          title="Delete customer"
          description={
            deleteError ??
            `Are you sure you want to delete "${customer.fullName}"? This cannot be undone.`
          }
          confirmLabel="Yes, delete"
          disableDismiss={Boolean(deleteError)}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setDeleteError(null);
          }}
          onConfirm={async () => {
            try {
              setDeleteError(null);
              await onDelete(customer.id);
              setDeleteConfirmOpen(false);
              onClose();
            } catch (e) {
              setDeleteError(
                e instanceof Error ? e.message : "Failed to delete customer",
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}
