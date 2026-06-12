import type {
  ClientStatus,
  Gender,
  Language,
  ReferralSource,
} from "@/lib/client-information/types";

const GENDER_LABELS: Record<Exclude<Gender, "">, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_disclose: "Prefer not to disclose",
};

const LANGUAGE_LABELS: Record<Exclude<Language, "">, string> = {
  sinhala: "Sinhala",
  tamil: "Tamil",
  english: "English",
  other: "Other",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  first_time_cafs: "Seeking support for the first time at CAFS",
  regular_client: "A regular client at CAFS",
  first_time_counselling:
    "Seeking counselling / therapeutic support for the first time",
};

export const REFERRAL_SOURCE_LABELS: Record<ReferralSource, string> = {
  family: "Referred by family",
  friends: "Referred by friends",
  school: "Referred by school",
  work: "Referred by work",
  medical_practitioner: "Referred by medical practitioner",
  mental_health_professional: "Referred by another mental health professional",
  social_media: "Social media",
  google_search: "Google search",
};

export function formatGender(gender?: Gender, genderOther?: string): string {
  if (!gender) return "—";
  if (gender === "other") {
    return genderOther?.trim() ? `Other (${genderOther.trim()})` : "Other";
  }
  return GENDER_LABELS[gender] ?? gender;
}

export function formatLanguage(language?: Language, languageOther?: string): string {
  if (!language) return "—";
  if (language === "other") {
    return languageOther?.trim() ? `Other (${languageOther.trim()})` : "Other";
  }
  return LANGUAGE_LABELS[language] ?? language;
}

export function formatClientStatusList(statuses?: ClientStatus[]): string {
  if (!statuses?.length) return "—";
  return getClientStatusItems(statuses).join("; ");
}

export function getClientStatusItems(statuses?: ClientStatus[]): string[] {
  if (!statuses?.length) return [];
  return statuses.map((s) => CLIENT_STATUS_LABELS[s] ?? s);
}

export type ReferralSourceItem = {
  label: string;
  detail?: string;
};

export function getReferralSourceItems(
  sources?: ReferralSource[],
  specs?: {
    medicalPractitionerSpec?: string;
    mentalHealthProfSpec?: string;
    socialMediaSpec?: string;
  },
): ReferralSourceItem[] {
  if (!sources?.length) return [];
  return sources.map((source) => {
    const label = REFERRAL_SOURCE_LABELS[source] ?? source;
    if (source === "medical_practitioner" && specs?.medicalPractitionerSpec?.trim()) {
      return { label, detail: specs.medicalPractitionerSpec.trim() };
    }
    if (source === "mental_health_professional" && specs?.mentalHealthProfSpec?.trim()) {
      return { label, detail: specs.mentalHealthProfSpec.trim() };
    }
    if (source === "social_media" && specs?.socialMediaSpec?.trim()) {
      return { label, detail: specs.socialMediaSpec.trim() };
    }
    return { label };
  });
}

export function formatReferralSources(
  sources?: ReferralSource[],
  specs?: {
    medicalPractitionerSpec?: string;
    mentalHealthProfSpec?: string;
    socialMediaSpec?: string;
  },
): string {
  const items = getReferralSourceItems(sources, specs);
  if (!items.length) return "—";
  return items
    .map((item) => (item.detail ? `${item.label}: ${item.detail}` : item.label))
    .join("; ");
}

export function formatSubmittedAt(iso?: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function displayValue(value?: string | null): string {
  const t = value?.trim();
  return t ? t : "—";
}
