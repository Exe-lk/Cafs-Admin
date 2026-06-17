"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServiceCategoryNavItem } from "@/components/admin/serviceCategories";

function mapApiItemsToCategories(items: Array<Record<string, unknown>>): ServiceCategoryNavItem[] {
  return items.map((s) => ({
    id: String(s.service_id ?? ""),
    label: String(s.name ?? "—"),
    count: 1,
  }));
}

export function useAdminServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategoryNavItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/services", {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as {
          status?: string;
          message?: string;
          data?: { items?: Array<Record<string, unknown>> };
        };
        if (!res.ok || json?.status !== "success" || !json?.data) {
          throw new Error(json?.message || `Failed to load services (HTTP ${res.status})`);
        }
        setCategories(mapApiItemsToCategories(json.data.items ?? []));
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load service categories");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return { categories, loading, error, reload };
}
