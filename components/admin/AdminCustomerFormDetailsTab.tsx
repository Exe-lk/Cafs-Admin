import type { ReactNode } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import {
  displayValue,
  formatGender,
  formatLanguage,
  formatReferralSources,
} from "@/lib/client-information/display-labels";
import {
  hasClientInformationSheet,
  type ClientInformationSheetPayload,
} from "@/lib/client-information/types";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function FormDetailRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-mgmt-outline-variant/10 py-3 last:border-b-0">
      <span title={label} className="shrink-0 cursor-default" aria-label={label}>
        <MaterialSymbol
          name={icon}
          className="mt-0.5 text-[20px] text-mgmt-on-surface-variant"
        />
      </span>
      <div className="min-w-0 flex-1 text-sm text-mgmt-on-surface">{children}</div>
    </div>
  );
}

function FormDetailValue({ value, multiline }: { value: string; multiline?: boolean }) {
  const empty = value === "—";
  if (multiline && !empty) {
    return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
  }
  return (
    <span className={cx(empty && "text-mgmt-on-surface-variant")}>{value}</span>
  );
}

function parseSheet(sheet: unknown): ClientInformationSheetPayload | null {
  if (!hasClientInformationSheet(sheet)) return null;
  return sheet as ClientInformationSheetPayload;
}

function EmptyState({ embedded = false }: { embedded?: boolean }) {
  return (
    <p
      className={cx(
        "text-sm text-mgmt-on-surface-variant",
        embedded ? "" : "py-10 text-center",
      )}
    >
      No client information sheet yet.
    </p>
  );
}

function FormDetailsContent({ sheet }: { sheet: unknown }) {
  const data = parseSheet(sheet);
  if (!data) return <EmptyState embedded />;

  const supportNeeds = displayValue(data.reasonsForSupport);
  const referralSources = formatReferralSources(data.referralSources, {
    medicalPractitionerSpec: data.medicalPractitionerSpec,
    mentalHealthProfSpec: data.mentalHealthProfSpec,
    socialMediaSpec: data.socialMediaSpec,
  });

  return (
    <>
      <FormDetailRow icon="supervisor_account" label="Guardian / parent">
        <FormDetailValue value={displayValue(data.guardianName)} />
      </FormDetailRow>

      <FormDetailRow icon="wc" label="Gender">
        <FormDetailValue value={formatGender(data.gender, data.genderOther)} />
      </FormDetailRow>

      <FormDetailRow icon="cake" label="Year of birth">
        <FormDetailValue value={displayValue(data.yearOfBirth)} />
      </FormDetailRow>

      <FormDetailRow icon="location_on" label="City of residence">
        <FormDetailValue value={displayValue(data.city)} />
      </FormDetailRow>

      <FormDetailRow icon="language" label="Preferred language">
        <FormDetailValue value={formatLanguage(data.language, data.languageOther)} />
      </FormDetailRow>

      <FormDetailRow icon="psychology" label="Support needs">
        <FormDetailValue value={supportNeeds} multiline />
      </FormDetailRow>

      <FormDetailRow icon="campaign" label="How did you hear about us?">
        <FormDetailValue value={referralSources} multiline />
      </FormDetailRow>
    </>
  );
}

export default function AdminCustomerFormDetailsTab({
  sheet,
  loading,
  error,
  embedded = false,
}: {
  sheet: unknown;
  loading?: boolean;
  error?: string | null;
  embedded?: boolean;
}) {
  if (loading) {
    return (
      <p
        className={cx(
          "text-sm text-mgmt-on-surface-variant",
          embedded ? "" : "py-10 text-center",
        )}
      >
        Loading form details…
      </p>
    );
  }

  if (error) {
    return (
      <p className={cx("text-sm text-red-700", embedded ? "" : "py-10 text-center")}>{error}</p>
    );
  }

  return <FormDetailsContent sheet={sheet} />;
}
