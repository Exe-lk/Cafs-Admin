import type { CSSProperties } from "react";

export const ADMIN_SIDEBAR_WIDTH_EXPANDED = "16rem";
export const ADMIN_SIDEBAR_WIDTH_COLLAPSED = "4rem";

/** Tailwind classes for fixed panels that sit immediately after the main admin sidebar. */
export function adminSidebarInsetLeft(breakpoint: "md" | "lg" = "md"): string {
  return `${breakpoint}:left-[var(--admin-sidebar-width,${ADMIN_SIDEBAR_WIDTH_EXPANDED})] ${breakpoint}:transition-[left] ${breakpoint}:duration-200 ${breakpoint}:ease-in-out`;
}

export function adminSidebarWidthStyle(collapsed: boolean): CSSProperties {
  return {
    "--admin-sidebar-width": collapsed
      ? ADMIN_SIDEBAR_WIDTH_COLLAPSED
      : ADMIN_SIDEBAR_WIDTH_EXPANDED,
  } as CSSProperties;
}
