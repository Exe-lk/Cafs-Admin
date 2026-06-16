"use client";

import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function TeamPanelOpenButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "hidden lg:inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold tracking-wide text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface",
        className,
      )}
      aria-label="Show team panel"
    >
      <MaterialSymbol name="view_sidebar" className="text-[20px]" />
      <span>Team</span>
    </button>
  );
}
