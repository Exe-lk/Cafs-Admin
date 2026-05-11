/** Same-origin path only (prevents open redirects after OAuth). */
export function safeNextPath(raw: string | null): string {
  if (!raw || raw[0] !== "/" || raw.startsWith("//") || raw.includes("://")) {
    return "/";
  }
  return raw;
}
