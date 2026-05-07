"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./SiteFooter";

export default function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (
    pathname === "/theraphist" ||
    pathname?.startsWith("/theraphist/") ||
    pathname === "/admin" ||
    pathname?.startsWith("/admin/") ||
    pathname === "/account" ||
    pathname?.startsWith("/account/")
  ) {
    return null;
  }
  return <SiteFooter />;
}
