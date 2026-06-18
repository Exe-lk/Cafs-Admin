"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServiceCategoryNavItem } from "@/components/admin/serviceCategories";
import { SERVICE_CATEGORIES_RELOAD_EVENT } from "@/components/admin/serviceCategories";

function mapApiItemsToCategories(
  items: Array<Record<string, unknown>>,
  countByServiceId: Map<string, number>,
): ServiceCategoryNavItem[] {
  // Service categories live in the `services` table (not therapist_services).
  return items
    .filter((s) => s.is_active !== false)
    .map((s) => {
      const id = String(s.service_id ?? "");
      if (!id) return null;
      return {
        id,
        label: String(s.name ?? "—"),
        count: countByServiceId.get(id) ?? 0,
      };
    })
    .filter((c): c is ServiceCategoryNavItem => Boolean(c));
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
        const [servicesRes, therapistServicesRes] = await Promise.all([
          fetch("/api/v1/admin/services", {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
          fetch("/api/v1/admin/therapist-services?isActive=true", {
            method: "GET",
            cache: "no-store",
            signal: ac.signal,
          }),
        ]);

        const servicesJson = (await servicesRes.json()) as {
          status?: string;
          message?: string;
          data?: { items?: Array<Record<string, unknown>> };
        };
        const therapistServicesJson = (await therapistServicesRes.json()) as {
          status?: string;
          data?: { items?: Array<Record<string, unknown>> };
        };

        if (!servicesRes.ok || servicesJson?.status !== "success" || !servicesJson?.data) {
          throw new Error(servicesJson?.message || `Failed to load services (HTTP ${servicesRes.status})`);
        }

        const countByServiceId = new Map<string, number>();
        for (const row of therapistServicesJson.data?.items ?? []) {
          const serviceId = String(row.service_id ?? "");
          if (!serviceId) continue;
          countByServiceId.set(serviceId, (countByServiceId.get(serviceId) ?? 0) + 1);
        }

        setCategories(mapApiItemsToCategories(servicesJson.data.items ?? [], countByServiceId));
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

  useEffect(() => {
    const onReload = () => reload();
    window.addEventListener(SERVICE_CATEGORIES_RELOAD_EVENT, onReload);
    return () => window.removeEventListener(SERVICE_CATEGORIES_RELOAD_EVENT, onReload);
  }, [reload]);

  return { categories, loading, error, reload };
}
