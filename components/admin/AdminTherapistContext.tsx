"use client";

import { createContext, useContext } from "react";
import type { AdminTherapistProfile } from "@/components/admin/EditTherapistProfileModal";

export type AdminTherapistContextValue = {
  selectedId: string;
  profile: AdminTherapistProfile;
  updateProfile: (next: AdminTherapistProfile) => void;
};

const Ctx = createContext<AdminTherapistContextValue | null>(null);

export function AdminTherapistProvider({
  value,
  children,
}: {
  value: AdminTherapistContextValue;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminTherapist() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminTherapist must be used inside AdminTherapistProvider");
  return v;
}

