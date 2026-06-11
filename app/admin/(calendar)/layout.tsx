import type { ReactNode } from "react";
import AdminCalendarSectionShell from "@/components/admin/AdminCalendarSectionShell";

export default function AdminCalendarLayout({ children }: { children: ReactNode }) {
  return <AdminCalendarSectionShell>{children}</AdminCalendarSectionShell>;
}
