import { redirect } from "next/navigation";

export default function PendingAppointmentsRedirectPage() {
  redirect("/admin/appointments");
}
