export const CUSTOMER_FULL_NAME_MAX_LEN = 200;
export const CUSTOMER_PHONE_MAX_LEN = 30;
export const CUSTOMER_PHONE_MIN_DIGITS = 9;
export const CUSTOMER_PHONE_MAX_DIGITS = 15;
export const CUSTOMER_EMAIL_MAX_LEN = 254;
export const CUSTOMER_COMPANY_MAX_LEN = 200;
export const CUSTOMER_ADDRESS_MAX_LEN = 500;

export const CUSTOMER_COUNTRIES = [
  "Sri Lanka",
  "United States",
  "United Kingdom",
  "Australia",
  "India",
  "Singapore",
] as const;

export type CustomerCountry = (typeof CUSTOMER_COUNTRIES)[number];

export type CustomerFormFields = {
  fullName: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  country: string;
};

export type CustomerFormFieldKey = keyof CustomerFormFields;

export type CustomerFormFieldErrors = Partial<Record<CustomerFormFieldKey, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s-]/g, "").slice(0, CUSTOMER_PHONE_MAX_LEN);
}

export function validateFullName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Full name is required.";
  if (trimmed.length > CUSTOMER_FULL_NAME_MAX_LEN) {
    return `Full name must be at most ${CUSTOMER_FULL_NAME_MAX_LEN} characters.`;
  }
  return null;
}

export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Phone number is required.";
  if (trimmed.length > CUSTOMER_PHONE_MAX_LEN) {
    return `Phone number must be at most ${CUSTOMER_PHONE_MAX_LEN} characters.`;
  }
  const digits = phoneDigitCount(trimmed);
  if (digits < CUSTOMER_PHONE_MIN_DIGITS || digits > CUSTOMER_PHONE_MAX_DIGITS) {
    return `Phone number must contain ${CUSTOMER_PHONE_MIN_DIGITS}–${CUSTOMER_PHONE_MAX_DIGITS} digits.`;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > CUSTOMER_EMAIL_MAX_LEN) {
    return `Email must be at most ${CUSTOMER_EMAIL_MAX_LEN} characters.`;
  }
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function validateCompany(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > CUSTOMER_COMPANY_MAX_LEN) {
    return `Company must be at most ${CUSTOMER_COMPANY_MAX_LEN} characters.`;
  }
  return null;
}

export function validateAddress(value: string): string | null {
  if (value.length > CUSTOMER_ADDRESS_MAX_LEN) {
    return `Address must be at most ${CUSTOMER_ADDRESS_MAX_LEN} characters.`;
  }
  return null;
}

export function validateCountry(value: string): string | null {
  if (!value.trim()) return "Country is required.";
  if (!(CUSTOMER_COUNTRIES as readonly string[]).includes(value)) {
    return "Select a valid country.";
  }
  return null;
}

export function validateCustomerForm(fields: CustomerFormFields): CustomerFormFieldErrors {
  const errors: CustomerFormFieldErrors = {};
  const fullName = validateFullName(fields.fullName);
  if (fullName) errors.fullName = fullName;
  const phone = validatePhone(fields.phone);
  if (phone) errors.phone = phone;
  const email = validateEmail(fields.email);
  if (email) errors.email = email;
  const company = validateCompany(fields.company);
  if (company) errors.company = company;
  const address = validateAddress(fields.address);
  if (address) errors.address = address;
  const country = validateCountry(fields.country);
  if (country) errors.country = country;
  return errors;
}

export function isCustomerFormValid(fields: CustomerFormFields): boolean {
  return Object.keys(validateCustomerForm(fields)).length === 0;
}

export function validateCustomerFormField(
  field: CustomerFormFieldKey,
  fields: CustomerFormFields,
): string | null {
  switch (field) {
    case "fullName":
      return validateFullName(fields.fullName);
    case "phone":
      return validatePhone(fields.phone);
    case "email":
      return validateEmail(fields.email);
    case "company":
      return validateCompany(fields.company);
    case "address":
      return validateAddress(fields.address);
    case "country":
      return validateCountry(fields.country);
    default:
      return null;
  }
}
