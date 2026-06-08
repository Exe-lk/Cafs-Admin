import { useEffect, useMemo, useState } from "react";
import { DEFAULT_THERAPIST_TIMEZONE, normalizeTimeZone } from "@/lib/timezone";

export type AdminTherapistListItem = {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  status?: "Active" | "Inactive";
  timezone: string;
};

type ApiEnvelope<T> = {
  status: "success" | "error";
  code: number;
  message: string;
  timestamp: string;
  data: T | null;
};

type TherapistsApiItem = {
  therapist_id: string;
  visibility: "public" | "private";
  specialties: string | null;
  timezone?: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export function useAdminTherapists() {
  const [items, setItems] = useState<TherapistsApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/v1/admin/therapists", {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });

        const json = (await res.json()) as ApiEnvelope<{ items: TherapistsApiItem[] }>;
        if (!res.ok || json.status !== "success" || !json.data) {
          throw new Error(json.message || `Failed to load therapists (HTTP ${res.status})`);
        }

        setItems(Array.isArray(json.data.items) ? json.data.items : []);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setItems([]);
        setError(e instanceof Error ? e.message : "Failed to load therapists");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [reloadKey]);

  const therapists = useMemo<AdminTherapistListItem[]>(() => {
    return items.map((t) => {
      const name = (t.profiles?.full_name ?? "").trim() || "Therapist";
      const email = (t.profiles?.email ?? "").trim() || "—";
      const specialty = (t.specialties ?? "").trim() || undefined;
      return {
        id: t.therapist_id,
        name,
        email,
        specialty,
        status: t.visibility === "private" ? "Inactive" : "Active",
        timezone: normalizeTimeZone(t.timezone ?? DEFAULT_THERAPIST_TIMEZONE),
      };
    });
  }, [items]);

  return { therapists, loading, error, refetch: () => setReloadKey((k) => k + 1) };
}

