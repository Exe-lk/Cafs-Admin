"use client";

import { useMemo, useRef, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const BRAND_SWATCHES = [
  "#1a2332",
  "#c45c26",
  "#e07b39",
  "#e6b422",
  "#6b4ea2",
  "#2563eb",
  "#c4a574",
  "#6b7280",
  "#0d9488",
  "#16a34a",
  "#171717",
] as const;

const INDUSTRY_OPTIONS = [
  { value: "", label: "Select" },
  { value: "healthcare", label: "Healthcare" },
  { value: "fitness", label: "Fitness & wellness" },
  { value: "therapy", label: "Therapy & counseling" },
  { value: "coaching", label: "Coaching" },
  { value: "other", label: "Other" },
] as const;

const BOOKING_URL_SUFFIX = ".cafs.com/book";

const fieldInputShell =
  "w-full rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 py-3 text-sm text-mgmt-on-surface outline-none transition-shadow placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

const fieldInputClass = `mt-2 ${fieldInputShell}`;

const fieldSelectClass =
  "h-12 w-full appearance-none rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 pr-10 text-sm text-mgmt-on-surface outline-none transition-shadow focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15";

const PHONE_COUNTRY_OPTIONS = [
  { value: "+94", label: "+94" },
  { value: "+1", label: "+1" },
  { value: "+44", label: "+44" },
  { value: "+61", label: "+61" },
  { value: "+91", label: "+91" },
] as const;

const STATE_OPTIONS = [
  { value: "", label: "Select" },
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "TX", label: "Texas" },
  { value: "WP", label: "Western Province" },
] as const;

const COUNTRY_OPTIONS = [
  { value: "LK", label: "Sri Lanka" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "LKR", label: "Sri Lanka - LKR Rs" },
  { value: "USD", label: "United States - USD $" },
  { value: "GBP", label: "United Kingdom - GBP £" },
] as const;

type BrandDayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type BrandDayRow = {
  key: BrandDayKey;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
};

const BRAND_TIME_OPTIONS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

function formatBrandTimeLabel(value: string) {
  const [hh, mm] = value.split(":").map((n) => Number(n));
  const hours = hh ?? 0;
  const minutes = mm ?? 0;
  const isPm = hours >= 12;
  const displayH = ((hours + 11) % 12) + 1;
  const displayM = String(minutes).padStart(2, "0");
  return `${displayH}:${displayM} ${isPm ? "PM" : "AM"}`;
}

const BRAND_DAY_ORDER: BrandDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function createDefaultBrandHours(): BrandDayRow[] {
  return BRAND_DAY_ORDER.map((k, i) => ({
    key: k,
    label: k[0]!.toUpperCase() + k.slice(1),
    enabled: i < 5,
    start: "09:00",
    end: "17:00",
  }));
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0" aria-hidden>
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        className="stroke-mgmt-surface-container-high"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        className="stroke-mgmt-on-surface"
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

export default function AdminSettingsBrandPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState("exercise");
  const [bookingSlug, setBookingSlug] = useState("exercise2ffw");
  const [industry, setIndustry] = useState("");
  const [about, setAbout] = useState("");
  const [brandColor, setBrandColor] = useState<string>(BRAND_SWATCHES[BRAND_SWATCHES.length - 1]!);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [primaryEmail, setPrimaryEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+94");
  const [primaryPhone, setPrimaryPhone] = useState("70 166 4179");
  const [moreContactOpen, setMoreContactOpen] = useState(false);
  const [altEmail, setAltEmail] = useState("");

  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("LK");
  const [currency, setCurrency] = useState("LKR");

  const [brandHours, setBrandHours] = useState<BrandDayRow[]>(() => createDefaultBrandHours());

  const brandTimeSelectOptions = useMemo(
    () =>
      BRAND_TIME_OPTIONS.map((t) => ({
        value: t,
        label: formatBrandTimeLabel(t),
      })),
    [],
  );

  const completion = useMemo(() => {
    let filled = 0;
    const total = 14;
    if (businessName.trim()) filled++;
    if (bookingSlug.trim()) filled++;
    if (industry) filled++;
    if (about.trim()) filled++;
    if (coverPreview) filled++;
    if (logoPreview) filled++;
    if (brandColor) filled++;
    if (primaryEmail.trim()) filled++;
    if (primaryPhone.trim()) filled++;
    if (addressLine.trim()) filled++;
    if (city.trim()) filled++;
    if (country) filled++;
    if (currency) filled++;
    if (brandHours.some((d) => d.enabled)) filled++;
    return Math.round((filled / total) * 100);
  }, [
    about,
    addressLine,
    bookingSlug,
    brandColor,
    brandHours,
    businessName,
    city,
    country,
    coverPreview,
    currency,
    industry,
    logoPreview,
    primaryEmail,
    primaryPhone,
  ]);

  function copyMondayToWeekdays() {
    const mon = brandHours.find((d) => d.key === "monday");
    if (!mon) return;
    setBrandHours((prev) =>
      prev.map((d) =>
        ["tuesday", "wednesday", "thursday", "friday"].includes(d.key)
          ? { ...d, enabled: mon.enabled, start: mon.start, end: mon.end }
          : d,
      ),
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-mgmt-surface-container-lowest">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-mgmt-outline-variant/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-mgmt-on-surface">Your brand</h1>
            
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl bg-mgmt-primary px-4 py-2 text-sm font-semibold text-mgmt-on-primary transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </header>

        <section className="space-y-8">
          <h2 className="text-lg font-bold text-mgmt-on-surface">Brand details</h2>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-mgmt-on-surface-variant">
              Cover image
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-mgmt-outline-variant/20 bg-mgmt-surface-container-low">
              <div
                className="aspect-[2.4/1] min-h-[140px] w-full bg-cover bg-center sm:min-h-[180px]"
                style={
                  coverPreview
                    ? { backgroundImage: `url(${coverPreview})` }
                    : {
                        background:
                          "linear-gradient(135deg, #dbeafe 0%, #fef3c7 35%, #fce7f3 70%, #e0e7ff 100%)",
                      }
                }
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-mgmt-outline-variant/30 bg-white/95 px-3 py-1.5 text-xs font-semibold text-mgmt-on-surface shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                >
                  <MaterialSymbol name="edit" className="text-[16px]" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverPreview(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-mgmt-outline-variant/30 bg-white/95 text-mgmt-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-red-600"
                  aria-label="Remove cover image"
                >
                  <MaterialSymbol name="delete" className="text-[18px]" />
                </button>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCoverPreview(URL.createObjectURL(f));
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-mgmt-outline-variant/25 bg-mgmt-surface-container-low"
                style={
                  logoPreview
                    ? { backgroundImage: `url(${logoPreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              >
                {!logoPreview ? (
                  <MaterialSymbol name="forest" className="text-[40px] text-mgmt-on-surface-variant/50" />
                ) : null}
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-mgmt-on-surface">Brand logo</p>
                <p className="mt-1 text-xs leading-relaxed text-mgmt-on-surface-variant">
                  Select a 200 × 200 px image, up to 10 MB in size
                </p>
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-mgmt-outline-variant/40 bg-mgmt-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
              >
                <MaterialSymbol name="photo_camera" className="text-[20px] text-mgmt-on-surface-variant" />
                Upload logo
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setLogoPreview(URL.createObjectURL(f));
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-mgmt-on-surface">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 py-3 text-sm text-mgmt-on-surface outline-none transition-shadow placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15"
                autoComplete="organization"
              />
            </div>

            

            <div>
              <label className="block text-sm font-semibold text-mgmt-on-surface">Industry</label>
              <div className="relative mt-2">
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 pr-10 text-sm text-mgmt-on-surface outline-none transition-shadow focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15"
                >
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[22px] text-mgmt-on-surface-variant"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-mgmt-on-surface">About</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={5}
                placeholder="Tell the world about your brand"
                className="mt-2 w-full resize-y rounded-xl border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest px-4 py-3 text-sm text-mgmt-on-surface outline-none transition-shadow placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15"
              />
            </div>
          </div>
        </section>

        <section className="mt-14 space-y-6 border-t border-mgmt-outline-variant/15 pt-12">
          <div>
            <h2 className="text-lg font-bold text-mgmt-on-surface">Appearance</h2>
            <p className="mt-2 text-sm leading-relaxed text-mgmt-on-surface-variant">
              Style your Booking Page to reflect your brand identity.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-mgmt-on-surface">Brand color</p>
            <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
              {BRAND_SWATCHES.map((hex) => {
                const selected = brandColor === hex;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setBrandColor(hex)}
                    aria-label={`Brand color ${hex}`}
                    className={cx(
                      "flex h-11 w-11 items-center justify-center rounded-full transition-transform",
                      selected && "ring-2 ring-mgmt-on-surface ring-offset-2 ring-offset-mgmt-surface-container-lowest",
                    )}
                  >
                    <span
                      className="h-7 w-7 rounded-full shadow-sm ring-1 ring-black/10"
                      style={{ backgroundColor: hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-14 space-y-6 border-t border-mgmt-outline-variant/15 pt-12">
          <div>
            <h2 className="text-lg font-bold text-mgmt-on-surface">Contact details</h2>
            <p className="mt-2 text-sm leading-relaxed text-mgmt-on-surface-variant">
              Let your leads and customers know how to reach you.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-mgmt-on-surface">Primary email</label>
            <input
              type="email"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              className={fieldInputClass}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-mgmt-on-surface">Primary phone</label>
            <div className="mt-2 flex gap-2">
              <div className="relative w-[5.5rem] shrink-0">
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className={cx(fieldSelectClass, "px-2 pr-8")}
                  aria-label="Country calling code"
                >
                  {PHONE_COUNTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                />
              </div>
              <input
                type="tel"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                className={cx(fieldInputShell, "min-w-0 flex-1")}
                placeholder="70 166 4179"
                autoComplete="tel-national"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMoreContactOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-mgmt-primary hover:underline"
          >
            <MaterialSymbol name="add" className="text-[18px]" />
            Add more
          </button>

          {moreContactOpen ? (
            <div className="space-y-4 rounded-xl border border-mgmt-outline-variant/20 bg-mgmt-surface-container-low/50 p-4">
              <div>
                <label className="block text-sm font-semibold text-mgmt-on-surface">Additional email</label>
                <input
                  type="email"
                  value={altEmail}
                  onChange={(e) => setAltEmail(e.target.value)}
                  className={fieldInputClass}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-14 space-y-6 border-t border-mgmt-outline-variant/15 pt-12">
          <div>
            <h2 className="text-lg font-bold text-mgmt-on-surface">Location</h2>
            <p className="mt-2 text-sm leading-relaxed text-mgmt-on-surface-variant">
              Provide a business address to list on your Booking Page.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-mgmt-on-surface">Address</label>
            <input
              type="text"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className={fieldInputClass}
              placeholder="Business name, street name, apt, suite, floor"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-mgmt-on-surface">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={fieldInputClass}
              placeholder="San Francisco"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div>
              <label className="block text-sm font-semibold text-mgmt-on-surface">State</label>
              <div className="relative mt-2">
                <select
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  className={fieldSelectClass}
                >
                  {STATE_OPTIONS.map((o) => (
                    <option key={o.value || "sel"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <MaterialSymbol
                  name="expand_more"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[22px] text-mgmt-on-surface-variant"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-mgmt-on-surface">Zip or postal code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className={fieldInputClass}
                placeholder="000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-mgmt-on-surface">Country</label>
            <div className="relative mt-2">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={fieldSelectClass}>
                {COUNTRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <MaterialSymbol
                name="expand_more"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[22px] text-mgmt-on-surface-variant"
              />
            </div>
          </div>

          
        </section>

        <section className="mt-14 space-y-6 border-t border-mgmt-outline-variant/15 pt-12 pb-8">
          <div>
            <h2 className="text-lg font-bold text-mgmt-on-surface">Business hours</h2>
            <p className="mt-2 text-sm leading-relaxed text-mgmt-on-surface-variant">
              Highlight when your business opens and closes on your Booking Page.
            </p>
          </div>

          <div className="divide-y divide-mgmt-outline-variant/15 border-t border-b border-mgmt-outline-variant/15">
            {brandHours.map((d) => {
              const isMonday = d.key === "monday";
              return (
                <div key={d.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-4 sm:w-[200px] sm:shrink-0">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        className="peer sr-only"
                        type="checkbox"
                        checked={d.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setBrandHours((prev) =>
                            prev.map((x) => (x.key === d.key ? { ...x, enabled: checked } : x)),
                          );
                        }}
                        aria-label={`${d.label} open or closed`}
                      />
                      <div className="h-6 w-11 rounded-full bg-mgmt-surface-container-high after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-mgmt-on-surface peer-checked:after:translate-x-full" />
                    </label>
                    <span className="text-sm font-semibold text-mgmt-on-surface">{d.label}</span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                    {d.enabled ? (
                      <>
                        <div className="relative min-w-[7rem]">
                          <select
                            value={d.start}
                            onChange={(e) => {
                              const start = e.target.value;
                              setBrandHours((prev) =>
                                prev.map((x) => (x.key === d.key ? { ...x, start } : x)),
                              );
                            }}
                            className={cx(fieldSelectClass, "pr-9")}
                            aria-label={`${d.label} start`}
                          >
                            {brandTimeSelectOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <MaterialSymbol
                            name="expand_more"
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                          />
                        </div>
                        <span className="text-sm text-mgmt-on-surface-variant">—</span>
                        <div className="relative min-w-[7rem]">
                          <select
                            value={d.end}
                            onChange={(e) => {
                              const end = e.target.value;
                              setBrandHours((prev) =>
                                prev.map((x) => (x.key === d.key ? { ...x, end } : x)),
                              );
                            }}
                            className={cx(fieldSelectClass, "pr-9")}
                            aria-label={`${d.label} end`}
                          >
                            {brandTimeSelectOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <MaterialSymbol
                            name="expand_more"
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-mgmt-on-surface-variant"
                          />
                        </div>
                        {isMonday ? (
                          <button
                            type="button"
                            onClick={copyMondayToWeekdays}
                            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
                            title="Copy to Tuesday–Friday"
                            aria-label="Copy Monday hours to Tuesday through Friday"
                          >
                            <MaterialSymbol name="content_copy" className="text-[20px]" />
                          </button>
                        ) : (
                          <div className="hidden w-10 sm:block" aria-hidden />
                        )}
                      </>
                    ) : (
                      <span className="rounded-lg bg-mgmt-surface-container-low px-4 py-2 text-sm font-medium text-mgmt-on-surface-variant">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
