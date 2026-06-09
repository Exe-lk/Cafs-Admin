"use client";

import { useMemo } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import SettingsTabs from "@/components/admin/settings/SettingsTabs";

export default function SettingsHeader({
  displayName = "Thilina Dilshan",
  actions,
}: {
  displayName?: string;
  actions?: React.ReactNode;
}) {
  const location = "Colombo, 1, LK";
  const localTime = "11:26 AM";

  const initials = useMemo(() => {
    const t = displayName.trim();
    return t ? t[0]!.toUpperCase() : "T";
  }, [displayName]);

  return (
    <div className="bg-mgmt-surface-container-lowest">
      <header className="px-4 pt-6 pb-4 sm:px-6 lg:px-10 lg:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mgmt-primary-container text-lg font-bold text-mgmt-on-primary-container">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold leading-tight text-mgmt-on-surface">
                {displayName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-mgmt-on-surface-variant">
                <span className="flex items-center gap-1">
                  <MaterialSymbol name="location_on" className="text-[14px]" />
                  {location}
                </span>
                <span className="flex items-center gap-1">
                  <MaterialSymbol name="schedule" className="text-[14px]" />
                  {localTime}
                </span>
              </div>
            </div>
          </div>

          {actions ? (
            <div className="w-full sm:w-auto sm:shrink-0">
              <div className="flex w-full justify-start sm:justify-end">{actions}</div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-10">
        <SettingsTabs />
      </div>
    </div>
  );
}

