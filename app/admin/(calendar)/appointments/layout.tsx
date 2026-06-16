import type { ReactNode } from "react";
import { Suspense } from "react";
import AdminAppointmentsShell from "@/components/admin/AdminAppointmentsShell";

export default function AdminAppointmentsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-full min-h-0 flex-1 bg-mgmt-surface-container-lowest" />}>
      <AdminAppointmentsShell>{children}</AdminAppointmentsShell>
    </Suspense>
  );
}
