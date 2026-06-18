"use client";

import SettingsTabs from "@/components/admin/settings/SettingsTabs";
import ProfileAvatarUpload from "@/components/admin/ProfileAvatarUpload";

export default function SettingsHeader({
  displayName = "Thilina Dilshan",
  avatarUrl,
  onAvatarChange,
  actions,
  prefix,
}: {
  displayName?: string;
  avatarUrl?: string | null;
  onAvatarChange?: (url: string | null) => void;
  actions?: React.ReactNode;
  prefix?: React.ReactNode;
}) {
  return (
    <div className="bg-mgmt-surface-container-lowest">
      <header className="px-4 pt-6 pb-4 sm:px-6 lg:px-10 lg:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            {prefix ? <div className="shrink-0">{prefix}</div> : null}
            <ProfileAvatarUpload
              imageUrl={avatarUrl}
              alt={displayName}
              onImageChange={onAvatarChange}
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold leading-tight text-mgmt-on-surface sm:text-[2rem]">
                {displayName}
              </h1>
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
