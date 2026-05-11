import type { ReactNode } from "react";
import AdminTheraphistShell from "@/components/admin/AdminTheraphistShell";

export default function TheraphistSettingsLayout({ children }: { children: ReactNode }) {
  return <AdminTheraphistShell>{children}</AdminTheraphistShell>;
}

