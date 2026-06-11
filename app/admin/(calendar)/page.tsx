"use client";

import { useEffect, useMemo, useState } from "react";
import TherapistsDirectoryColumn from "@/components/admin/TherapistsDirectoryColumn";
import AdminCalendarHome from "@/components/admin/AdminCalendarHome";
import CreateTherapistModal from "@/components/admin/CreateTherapistModal";
import { type AdminTherapistListItem, useAdminTherapists } from "@/components/admin/useAdminTherapists";

export default function TheraphistHomePage() {
  const { therapists, loading, refetch } = useAdminTherapists();
  const [selectedId, setSelectedId] = useState<string>("");
  const [createTherapistOpen, setCreateTherapistOpen] = useState(false);

  const selected = useMemo<AdminTherapistListItem | undefined>(() => {
    return therapists.find((t) => t.id === selectedId) ?? therapists[0];
  }, [selectedId, therapists]);

  useEffect(() => {
    if (!selectedId && therapists.length) {
      setSelectedId(therapists[0]!.id);
    }
  }, [selectedId, therapists]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Mobile: therapist selector */}
      <div className="sticky top-0 z-40 border-b border-mgmt-outline-variant/10 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex flex-col gap-2">
          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-mgmt-on-surface-variant">
            Therapist
          </p>
          <select
            value={selectedId || selected?.id || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-11 w-full rounded-xl border border-mgmt-outline-variant/20 bg-white px-3 text-sm font-semibold text-mgmt-on-surface shadow-sm outline-none"
            disabled={loading || therapists.length === 0}
          >
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selected?.specialty ? (
            <p className="text-xs text-mgmt-on-surface-variant">{selected.specialty}</p>
          ) : null}
        </div>
      </div>

      {/* Desktop: fixed full-viewport white column + spacer (matches settings / therapist shell) */}
      <div
        className="hidden overflow-hidden border-r border-mgmt-outline-variant/10 bg-mgmt-surface-container-lowest lg:fixed lg:left-64 lg:top-0 lg:z-40 lg:flex lg:h-dvh lg:w-72 lg:flex-col"
        data-purpose="therapist-directory-fixed"
      >
        <TherapistsDirectoryColumn
          therapists={therapists}
          selectedId={selectedId}
          onSelect={(t) => setSelectedId(t.id)}
          onAdd={() => setCreateTherapistOpen(true)}
        />
      </div>
      <div className="hidden w-72 shrink-0 lg:block" aria-hidden />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminCalendarHome
          therapistId={selected?.id}
          therapistTimezone={selected?.timezone}
          onAddTherapist={() => setCreateTherapistOpen(true)}
        />
      </div>

      {createTherapistOpen ? (
        <CreateTherapistModal
          onClose={() => setCreateTherapistOpen(false)}
          onCreate={async (draft) => {
            const phone = [draft.phoneCountry.trim(), draft.phoneNumber.trim()].filter(Boolean).join(" ");

            const userRes = await fetch("/api/v1/admin/users", {
              method: "POST",
              cache: "no-store",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                fullName: draft.fullName,
                email: draft.email,
                phone: phone || undefined,
                role: "therapist",
                isActive: !draft.hidden,
              }),
            });
            const userJson = (await userRes.json()) as {
              status?: string;
              message?: string;
              data?: { userId?: string };
            };
            if (!userRes.ok || userJson?.status !== "success") {
              throw new Error(userJson?.message || `Failed to create user (HTTP ${userRes.status})`);
            }
            const userId = String(userJson?.data?.userId ?? "");
            if (!userId) throw new Error("Create user succeeded but no userId returned");

            const tRes = await fetch("/api/v1/admin/therapists", {
              method: "POST",
              cache: "no-store",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                userId,
                visibility: draft.hidden ? "private" : "public",
                bio: draft.aboutYou || undefined,
                specialties: draft.specialization ? [draft.specialization] : [],
              }),
            });
            const tJson = (await tRes.json()) as { status?: string; message?: string };
            if (!tRes.ok || tJson?.status !== "success") {
              throw new Error(tJson?.message || `Failed to create therapist (HTTP ${tRes.status})`);
            }

            refetch();
            setSelectedId(userId);
          }}
        />
      ) : null}
    </div>
  );
}
