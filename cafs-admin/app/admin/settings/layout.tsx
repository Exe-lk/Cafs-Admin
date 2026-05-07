import type { ReactNode } from "react";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";

export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return <AdminSettingsShell>{children}</AdminSettingsShell>;
}
