import type { ReactNode } from "react";
import AdminServicesShell from "@/components/admin/AdminServicesShell";

export default function TheraphistServicesLayout({ children }: { children: ReactNode }) {
  return <AdminServicesShell>{children}</AdminServicesShell>;
}
