import { useEffect, useMemo, useState } from "react";

export function useAdminProfile() {
  const [displayName, setDisplayName] = useState("Admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/v1/admin/me", {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as {
          status?: string;
          data?: { fullName?: string };
        };
        if (res.ok && json.status === "success" && json.data?.fullName) {
          setDisplayName(json.data.fullName);
        }
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
  }, [displayName]);

  return { displayName, initials, loading };
}
