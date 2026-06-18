"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import { useAdminTherapist } from "@/components/admin/AdminTherapistContext";

function TherapistDetailRow({
  icon,
  children,
  trailing,
  href,
}: {
  icon: string;
  children: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-4 border-b border-mgmt-outline-variant/10 py-4 last:border-b-0">
      <MaterialSymbol
        name={icon}
        className="mt-0.5 shrink-0 text-[20px] text-mgmt-on-surface-variant"
      />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm text-mgmt-on-surface">{children}</div>
        {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-mgmt-surface-container-low/40">
        {content}
      </Link>
    );
  }

  return content;
}

export default function TheraphistSettingsAboutPage() {
  const { profile } = useAdminTherapist();

  const phone = useMemo(() => {
    return [profile.phoneCountry.trim(), profile.phoneNumber.trim()].filter(Boolean).join(" ");
  }, [profile.phoneCountry, profile.phoneNumber]);

  const profileLink = useMemo(() => {
    return `https://cafsdev.exe.lk/services?${therapistBookingSlug(profile.fullName)}`;
  }, [profile.fullName]);

  const statusLabel = profile.hidden ? "Inactive" : "Active";
  const statusIcon = profile.hidden ? "visibility_off" : "check_circle";

  const [profileLinkCopied, setProfileLinkCopied] = useState(false);

  const copyProfileLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileLink);
      setProfileLinkCopied(true);
      window.setTimeout(() => setProfileLinkCopied(false), 2000);
    } catch {
      setProfileLinkCopied(false);
    }
  }, [profileLink]);

  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-12 lg:py-5">
      <div className="max-w-2xl">
        <TherapistDetailRow icon="call">
          {phone ? (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:underline">
              {phone}
            </a>
          ) : (
            <span className="text-mgmt-on-surface-variant underline decoration-mgmt-outline-variant/60 underline-offset-2">
              Add phone
            </span>
          )}
        </TherapistDetailRow>

        <TherapistDetailRow
          icon="mail"
          trailing={
            <span title="Email managed by admin">
              <MaterialSymbol name="lock" className="text-[16px] text-mgmt-on-surface-variant" />
            </span>
          }
        >
          {profile.email.trim() ? (
            <a href={`mailto:${profile.email}`} className="break-all hover:underline">
              {profile.email}
            </a>
          ) : (
            <span className="text-mgmt-on-surface-variant">—</span>
          )}
        </TherapistDetailRow>

        <TherapistDetailRow
          icon="public"
          trailing={
            <button
              type="button"
              onClick={() => void copyProfileLink()}
              className="rounded-lg p-1 text-mgmt-on-surface-variant transition-colors hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
              aria-label={profileLinkCopied ? "Copied" : "Copy profile link"}
              title={profileLinkCopied ? "Copied" : "Copy link"}
            >
              <MaterialSymbol
                name={profileLinkCopied ? "check" : "content_copy"}
                className="text-[18px]"
              />
            </button>
          }
        >
          <a
            href={profileLink}
            target="_blank"
            rel="noreferrer"
            className="break-all underline decoration-mgmt-outline-variant/60 underline-offset-2 hover:opacity-80"
          >
            {profileLink}
          </a>
        </TherapistDetailRow>

        {/* <TherapistDetailRow
          icon="schedule"
          href="/admin/theraphist/working-hours"
          trailing={
            <MaterialSymbol name="chevron_right" className="text-[20px] text-mgmt-on-surface-variant" />
          }
        >
          <span className="text-mgmt-on-surface-variant">
            Working hours · {timezoneLabel}
          </span>
        </TherapistDetailRow> */}

        <TherapistDetailRow icon="account_circle">
          <div className="space-y-2">
            <p className="font-semibold text-mgmt-on-surface">
              {profile.specialization.trim() || "Therapist"}
            </p>
            {profile.aboutYou.trim() ? (
              <p className="text-sm leading-relaxed text-mgmt-on-surface-variant">
                {profile.aboutYou}
              </p>
            ) : (
              <p className="text-sm text-mgmt-on-surface-variant underline decoration-mgmt-outline-variant/60 underline-offset-2">
                Add a professional summary
              </p>
            )}
          </div>
        </TherapistDetailRow>

        <TherapistDetailRow icon={statusIcon}>
          <span
            className={
              profile.hidden ? "text-mgmt-on-surface-variant" : "font-medium text-mgmt-on-surface"
            }
          >
            {statusLabel}
          </span>
        </TherapistDetailRow>
      </div>
    </div>
  );
}

function therapistBookingSlug(name: string) {
  const cleaned = name.replace(/^(dr\.|ms\.|mr\.)\s*/i, "").trim();
  const first = cleaned.split(/\s+/).filter(Boolean)[0] ?? "therapist";
  return first.toLowerCase();
}
