export type ApiErrorBody = {
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
};

/** Prefer field-level validation messages over generic API envelopes. */
export function formatApiErrorMessage(
  json: ApiErrorBody | null | undefined,
  fallback: string,
): string {
  const fieldMessages = (json?.errors ?? [])
    .map((entry) => entry.message?.trim())
    .filter((message): message is string => Boolean(message));

  if (fieldMessages.length === 1) return fieldMessages[0]!;
  if (fieldMessages.length > 1) return fieldMessages.join(" ");

  const message = json?.message?.trim();
  if (message && message !== "Validation error") return message;

  return fallback;
}
