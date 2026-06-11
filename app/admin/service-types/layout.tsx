import type { ReactNode } from "react";
import AdminServiceTypesShell from "@/components/admin/AdminServiceTypesShell";

export default function AdminServiceTypesLayout({ children }: { children: ReactNode }) {
  return <AdminServiceTypesShell>{children}</AdminServiceTypesShell>;
}
