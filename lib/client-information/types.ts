export type Gender =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_disclose"
  | "";

export type Language = "sinhala" | "tamil" | "english" | "other" | "";

export type ClientStatus =
  | "first_time_cafs"
  | "regular_client"
  | "first_time_counselling";

export type ReferralSource =
  | "family"
  | "friends"
  | "school"
  | "work"
  | "medical_practitioner"
  | "mental_health_professional"
  | "social_media"
  | "google_search";

export type ClientInformationSheetPayload = {
  clientName: string;
  guardianName?: string;
  yearOfBirth?: string;
  gender?: Gender;
  genderOther?: string;
  phone: string;
  city?: string;
  email: string;
  language?: Language;
  languageOther?: string;
  reasonsForSupport?: string;
  clientStatus?: ClientStatus[];
  referralSources?: ReferralSource[];
  medicalPractitionerSpec?: string;
  mentalHealthProfSpec?: string;
  socialMediaSpec?: string;
  submittedAt?: string;
};

export function hasClientInformationSheet(json: unknown): boolean {
  if (json == null) return false;
  if (typeof json !== "object" || Array.isArray(json)) return false;
  return Object.keys(json as Record<string, unknown>).length > 0;
}
