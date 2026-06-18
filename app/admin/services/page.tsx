import { Suspense } from "react";
import AdminServicesHome from "@/components/admin/AdminServicesHome";

export default function AdminServicesPage() {
  return (
    <Suspense fallback={null}>
      <AdminServicesHome />
    </Suspense>
  );
}
