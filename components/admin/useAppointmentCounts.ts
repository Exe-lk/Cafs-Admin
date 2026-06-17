"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppointmentStatusNav } from "@/components/admin/AppointmentsSubNav";

export type AppointmentCounts = {
  all: number;
  pending_payment: number;
  pending_confirmation: number;
  confirmed: number;
};

type AppointmentCountsContextValue = {
  counts: AppointmentCounts | null;
  loading: boolean;
  setCountsState: (counts: AppointmentCounts | null, loading: boolean) => void;
};

const AppointmentCountsContext = createContext<AppointmentCountsContextValue | null>(null);

const noopSetCountsState = () => {};

export function computeAppointmentCounts(
  items: ReadonlyArray<{ status: string }>,
): AppointmentCounts {
  const counts: AppointmentCounts = {
    all: items.length,
    pending_payment: 0,
    pending_confirmation: 0,
    confirmed: 0,
  };

  for (const item of items) {
    if (item.status === "pending_payment") counts.pending_payment += 1;
    else if (item.status === "pending_confirmation") counts.pending_confirmation += 1;
    else if (item.status === "confirmed") counts.confirmed += 1;
  }

  return counts;
}

export function countForAppointmentStatus(
  counts: AppointmentCounts | null,
  status: AppointmentStatusNav,
): number | null {
  if (!counts) return null;
  if (status === "all") return counts.all;
  return counts[status];
}

export function AppointmentCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<AppointmentCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const setCountsState = useCallback((nextCounts: AppointmentCounts | null, nextLoading: boolean) => {
    setCounts((prev) => {
      if (
        prev &&
        nextCounts &&
        prev.all === nextCounts.all &&
        prev.pending_payment === nextCounts.pending_payment &&
        prev.pending_confirmation === nextCounts.pending_confirmation &&
        prev.confirmed === nextCounts.confirmed
      ) {
        return prev;
      }
      return nextCounts;
    });
    setLoading((prev) => (prev === nextLoading ? prev : nextLoading));
  }, []);

  const value = useMemo(
    () => ({
      counts,
      loading,
      setCountsState,
    }),
    [counts, loading, setCountsState],
  );

  return createElement(AppointmentCountsContext.Provider, { value }, children);
}

export function useAppointmentCounts() {
  const ctx = useContext(AppointmentCountsContext);
  return {
    counts: ctx?.counts ?? null,
    loading: ctx?.loading ?? true,
  };
}

export function usePublishAppointmentCounts() {
  const ctx = useContext(AppointmentCountsContext);
  return ctx?.setCountsState ?? noopSetCountsState;
}
