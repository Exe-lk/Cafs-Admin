import MaterialSymbol from "@/components/admin/MaterialSymbol";
import {
  displayValue,
  formatGender,
  formatLanguage,
  formatSubmittedAt,
  getClientStatusItems,
  getReferralSourceItems,
} from "@/lib/client-information/display-labels";
import {
  hasClientInformationSheet,
  type ClientInformationSheetPayload,
} from "@/lib/client-information/types";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isEmptyValue(value: string) {
  return value === "—";
}

function Field({
  label,
  value,
  icon,
  multiline,
}: {
  label: string;
  value: string;
  icon?: string;
  multiline?: boolean;
}) {
  const empty = isEmptyValue(value);

  return (
    <div>
      <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
        {label}
      </label>
      {icon && !empty ? (
        <div className="flex min-w-0 items-start gap-3 text-mgmt-on-surface">
          <MaterialSymbol name={icon} className="mt-0.5 shrink-0 text-mgmt-primary" />
          {multiline ? (
            <p className="min-w-0 whitespace-pre-wrap text-sm font-medium leading-relaxed">{value}</p>
          ) : (
            <p className="min-w-0 truncate text-sm font-medium">{value}</p>
          )}
        </div>
      ) : multiline ? (
        <p
          className={cx(
            "whitespace-pre-wrap text-sm leading-relaxed",
            empty
              ? "italic text-mgmt-on-surface-variant/70"
              : "font-medium text-mgmt-on-surface",
          )}
        >
          {value}
        </p>
      ) : (
        <p
          className={cx(
            "text-sm",
            empty ? "italic text-mgmt-on-surface-variant/70" : "font-medium text-mgmt-on-surface",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-2xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-low",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-mgmt-surface-container bg-mgmt-surface-container-lowest px-5 py-4 sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mgmt-primary-container">
          <MaterialSymbol name={icon} className="text-[18px] text-mgmt-primary" />
        </span>
        <h4 className="text-sm font-semibold text-mgmt-on-surface">{title}</h4>
      </header>
      <div className="space-y-5 p-5 sm:space-y-6 sm:p-6">{children}</div>
    </section>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm italic text-mgmt-on-surface-variant/70">—</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex w-fit max-w-full items-start gap-2 rounded-full bg-mgmt-primary-container px-3.5 py-1.5 text-[0.7rem] font-semibold leading-snug text-mgmt-on-primary-container"
        >
          <MaterialSymbol name="check_circle" className="mt-px shrink-0 text-[14px]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ReferralList({
  items,
}: {
  items: ReturnType<typeof getReferralSourceItems>;
}) {
  if (!items.length) {
    return <p className="text-sm italic text-mgmt-on-surface-variant/70">—</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={`${item.label}-${item.detail ?? ""}`}
          className="rounded-xl bg-mgmt-surface-container-lowest px-4 py-3"
        >
          <p className="text-sm font-medium text-mgmt-on-surface">{item.label}</p>
          {item.detail ? (
            <p className="mt-1 text-xs text-mgmt-on-surface-variant">{item.detail}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function parseSheet(sheet: unknown): ClientInformationSheetPayload | null {
  if (!hasClientInformationSheet(sheet)) return null;
  return sheet as ClientInformationSheetPayload;
}

function EmptyState() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-mgmt-outline-variant bg-mgmt-surface-container-low px-6 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mgmt-surface-container-high">
          <MaterialSymbol name="assignment" className="text-3xl text-mgmt-on-surface-variant" />
        </span>
        <p className="mt-4 text-sm font-semibold text-mgmt-on-surface">
          No client information sheet yet
        </p>
        <p className="mt-2 text-xs leading-relaxed text-mgmt-on-surface-variant">
          When this client completes the intake form, their responses will appear here for your
          review.
        </p>
      </div>
    </div>
  );
}

function FormDetailsContent({ sheet }: { sheet: unknown }) {
  const data = parseSheet(sheet);
  if (!data) return <EmptyState />;

  const submittedAt = formatSubmittedAt(data.submittedAt);
  const clientStatusItems = getClientStatusItems(data.clientStatus);
  const referralItems = getReferralSourceItems(data.referralSources, {
    medicalPractitionerSpec: data.medicalPractitionerSpec,
    mentalHealthProfSpec: data.mentalHealthProfSpec,
    socialMediaSpec: data.socialMediaSpec,
  });
  const reasons = displayValue(data.reasonsForSupport);

  return (
    <div className="space-y-6 py-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mgmt-primary-container">
            <MaterialSymbol name="description" className="text-2xl text-mgmt-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
              Client information sheet
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-mgmt-on-surface">
              {displayValue(data.clientName)}
            </p>
            {data.guardianName?.trim() ? (
              <p className="mt-0.5 truncate text-xs text-mgmt-on-surface-variant">
                Guardian: {data.guardianName.trim()}
              </p>
            ) : null}
          </div>
        </div>
        {submittedAt ? (
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-mgmt-surface-container-high px-3.5 py-1.5 sm:self-center">
            <MaterialSymbol name="schedule" className="text-[16px] text-mgmt-on-surface-variant" />
            <span className="text-xs font-medium text-mgmt-on-surface-variant">
              Submitted {submittedAt}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="About the client" icon="person">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            <Field label="Client name" value={displayValue(data.clientName)} icon="badge" />
            <Field
              label="Guardian / parent"
              value={displayValue(data.guardianName)}
              icon="supervisor_account"
            />
            <Field label="Year of birth" value={displayValue(data.yearOfBirth)} icon="cake" />
            <Field
              label="Gender"
              value={formatGender(data.gender, data.genderOther)}
              icon="wc"
            />
          </div>
        </SectionCard>

        <SectionCard title="Contact details" icon="contact_mail">
          <div className="space-y-5">
            <Field label="Phone number" value={displayValue(data.phone)} icon="call" />
            <Field label="Email" value={displayValue(data.email)} icon="mail" />
            <Field label="City of residence" value={displayValue(data.city)} icon="location_on" />
          </div>
        </SectionCard>

        <SectionCard title="Language" icon="translate">
          <Field
            label="Preferred language"
            value={formatLanguage(data.language, data.languageOther)}
            icon="language"
          />
        </SectionCard>

        <SectionCard title="About you at CAFS" icon="home_health">
          <div>
            <label className="mb-3 block text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
              Client status
            </label>
            <ChipList items={clientStatusItems} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Support needs" icon="psychology" className="lg:col-span-2">
        <div>
          <label className="mb-3 block text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
            Reasons for seeking support
          </label>
          {isEmptyValue(reasons) ? (
            <p className="text-sm italic text-mgmt-on-surface-variant/70">—</p>
          ) : (
            <blockquote className="rounded-xl border-l-4 border-mgmt-primary bg-mgmt-surface-container-lowest px-4 py-4 text-sm leading-relaxed text-mgmt-on-surface sm:px-5">
              {reasons}
            </blockquote>
          )}
        </div>
      </SectionCard>

      <SectionCard title="How did you hear about us?" icon="campaign">
        <div>
          <label className="mb-3 block text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
            Referral sources
          </label>
          <ReferralList items={referralItems} />
        </div>
      </SectionCard>
    </div>
  );
}

export default function AdminCustomerFormDetailsTab({
  sheet,
  loading,
  error,
}: {
  sheet: unknown;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-mgmt-on-surface-variant">Loading form details…</p>
    );
  }

  if (error) {
    return <p className="py-10 text-center text-sm text-red-700">{error}</p>;
  }

  return <FormDetailsContent sheet={sheet} />;
}
