"use client";

import { useEffect, useRef, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import TherapistsDirectoryColumn from "@/components/admin/TherapistsDirectoryColumn";
import SettingsHeader from "@/components/admin/settings/SettingsHeader";
import EditTherapistProfileModal, {
  type AdminTherapistProfile,
} from "@/components/admin/EditTherapistProfileModal";
import ConfirmationModal from "@/components/admin/ConfirmationModal";
import { AdminTherapistProvider } from "@/components/admin/AdminTherapistContext";
import { adminSidebarInsetLeft } from "@/components/admin/adminSidebarLayout";
import TeamPanelOpenButton from "@/components/admin/TeamPanelOpenButton";
import { useTeamPanelOpen } from "@/components/admin/useTeamPanelOpen";
import CreateTherapistModal from "@/components/admin/CreateTherapistModal";
import { type AdminTherapistListItem } from "@/components/admin/useAdminTherapists";
import { DEFAULT_THERAPIST_TIMEZONE, normalizeTimeZone } from "@/lib/timezone";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminTheraphistShell({ children }: { children: React.ReactNode }) {
  const [therapists, setTherapists] = useState<AdminTherapistListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [teamPanelOpen, setTeamPanelOpen] = useTeamPanelOpen(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [profilesById, setProfilesById] = useState<Record<string, AdminTherapistProfile>>({});

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/therapists", {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as any;
        if (!res.ok || json?.status !== "success" || !json?.data) {
          throw new Error(json?.message || `Failed to load therapists (HTTP ${res.status})`);
        }

        const items = (json.data.items ?? []) as Array<any>;
        const nextList: AdminTherapistListItem[] = items.map((t) => ({
          id: String(t.therapist_id),
          name: String(t.profiles?.full_name ?? "—"),
          email: String(t.profiles?.email ?? ""),
          specialty: String(t.specialties ?? t.title ?? "").trim() || undefined,
          status: t.visibility === "private" ? "Inactive" : "Active",
          timezone: normalizeTimeZone(t.timezone ?? DEFAULT_THERAPIST_TIMEZONE),
        }));

        const nextProfiles: Record<string, AdminTherapistProfile> = {};
        for (const t of items) {
          const id = String(t.therapist_id);
          const phoneRaw = String(t.profiles?.phone ?? "");
          const phoneCountry = phoneRaw.startsWith("+") ? phoneRaw.split(/\s+/)[0] ?? "+94" : "+94";
          const phoneNumber = phoneRaw.startsWith("+")
            ? phoneRaw.replace(phoneCountry, "").trim()
            : phoneRaw;
          nextProfiles[id] = {
            id,
            fullName: String(t.profiles?.full_name ?? ""),
            phoneCountry: phoneCountry || "+94",
            phoneNumber: phoneNumber || "",
            email: String(t.profiles?.email ?? ""),
            specialization: String(t.specialties ?? t.title ?? "").trim(),
            aboutYou: String(t.bio ?? ""),
            hidden: t.visibility === "private",
            timezone: String(t.timezone ?? "").trim() || "Asia/Colombo",
            avatarUrl: null,
          };
        }

        setTherapists(nextList);
        setProfilesById(nextProfiles);
        setSelectedId((prev) => prev || nextList[0]?.id || "");
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load therapists");
        setTherapists([]);
        setProfilesById({});
        setSelectedId("");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [moreMenuOpen]);

  const selected = therapists.find((t) => t.id === selectedId) ?? therapists[0];
  const selectedProfile =
    (selected && profilesById[selected.id]) ||
    ({
      id: "unknown",
      fullName: "",
      phoneCountry: "+94",
      phoneNumber: "",
      email: "",
      specialization: "",
      aboutYou: "",
      hidden: false,
    } satisfies AdminTherapistProfile);

  function updateProfile(next: AdminTherapistProfile) {
    setProfilesById((prev) => ({ ...prev, [next.id]: next }));
    setTherapists((prev) =>
      prev.map((t) =>
        t.id !== next.id
          ? t
          : {
              ...t,
              name: next.fullName,
              email: next.email,
              specialty: next.specialization,
              status: next.hidden ? "Inactive" : "Active",
            },
      ),
    );
  }

  function setTherapistHidden(therapistId: string, hidden: boolean) {
    setTherapists((prev) =>
      prev.map((x) =>
        x.id !== therapistId ? x : { ...x, status: hidden ? "Inactive" : "Active" },
      ),
    );
    setProfilesById((prev) => ({
      ...prev,
      [therapistId]: { ...(prev[therapistId] ?? selectedProfile), hidden },
    }));
    void fetch(`/api/v1/admin/therapists/${therapistId}`, {
      method: "PUT",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: hidden ? "private" : "public" }),
    });
  }

  function deleteTherapist(therapistId: string) {
    setTherapists((prev) => {
      const next = prev.filter((x) => x.id !== therapistId);
      setSelectedId((prevSelectedId) => {
        if (prevSelectedId !== therapistId) return prevSelectedId;
        return next[0]?.id ?? "";
      });
      return next;
    });
    setProfilesById((prev) => {
      const { [therapistId]: removed, ...rest } = prev;
      void removed;
      return rest;
    });
  }

  const isSelectedHidden = selected?.status === "Inactive";

  return (
    <div className="flex h-full min-h-0 flex-1 bg-mgmt-surface-container-lowest">
      {/* Desktop: fixed full-viewport team column (hidden entirely when collapsed) */}
      {teamPanelOpen ? (
        <>
          <div
            className={cx(
              "hidden overflow-hidden border-r border-mgmt-outline-variant/10 bg-mgmt-surface-container-lowest lg:fixed lg:top-0 lg:z-40 lg:flex lg:h-dvh lg:w-72 lg:flex-col",
              adminSidebarInsetLeft("lg"),
            )}
            data-purpose="therapist-directory-fixed"
          >
            <TherapistsDirectoryColumn
              therapists={therapists}
              selectedId={selected?.id}
              onSelect={(t) => {
                setSelectedId(t.id);
              }}
              onAdd={() => setCreateOpen(true)}
            />
          </div>
          <div className="hidden w-72 shrink-0 lg:block" aria-hidden />
        </>
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col bg-mgmt-surface-container-lowest">
        {/* Mobile: therapist selector */}
        <div className="sticky top-1 z-40 border-b border-mgmt-outline-variant/10 bg-white/80 px-4 py-2 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <select
                value={selected?.id ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="h-10 w-full rounded-xl border border-mgmt-outline-variant/20 bg-white px-3 text-sm font-semibold text-mgmt-on-surface shadow-sm outline-none"
              >
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl bg-mgmt-primary px-4 py-3 text-xs font-bold text-mgmt-on-primary transition-opacity hover:opacity-90"
              onClick={() => setCreateOpen(true)}
            >
              + Add
            </button>
          </div>
        </div>

        <SettingsHeader
          displayName={selected?.name ?? "Therapist"}
          avatarUrl={selectedProfile.avatarUrl}
          onAvatarChange={(avatarUrl) => {
            if (!selected) return;
            updateProfile({ ...selectedProfile, avatarUrl });
          }}
          prefix={
            !teamPanelOpen ? <TeamPanelOpenButton onClick={() => setTeamPanelOpen(true)} /> : null
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
                onClick={() => setEditOpen(true)}
                aria-label="Edit profile"
              >
                <MaterialSymbol name="edit" className="text-[22px]" />
              </button>

              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((open) => !open)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
                  aria-label="More options"
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                >
                  <MaterialSymbol name="more_vert" className="text-[22px]" />
                </button>

                {moreMenuOpen ? (
                  <div
                    className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-mgmt-outline-variant/20 bg-white py-1 shadow-lg"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (!selected) return;
                        setMoreMenuOpen(false);
                        setTherapistHidden(selected.id, !isSelectedHidden);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
                    >
                      <MaterialSymbol
                        name={isSelectedHidden ? "visibility" : "visibility_off"}
                        className="text-[20px] text-mgmt-on-surface-variant"
                      />
                      {isSelectedHidden ? "Set to visible" : "Set to hidden"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setDeleteConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-mgmt-surface-container-low"
                    >
                      <MaterialSymbol name="delete" className="text-[20px]" />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto bg-mgmt-surface-container-lowest">
          {loading ? (
            <div className="px-10 py-12 text-sm text-mgmt-on-surface-variant">Loading…</div>
          ) : errorMsg ? (
            <div className="px-10 py-12 text-sm text-red-700">{errorMsg}</div>
          ) : selected ? (
            <AdminTherapistProvider
              value={{
                selectedId: selected.id,
                profile: selectedProfile,
                updateProfile,
              }}
            >
              <div key={selected.id}>{children}</div>
            </AdminTherapistProvider>
          ) : (
            <div className="px-10 py-12 text-sm text-mgmt-on-surface-variant">
              No therapists. Add one to get started.
            </div>
          )}
        </div>
      </section>

      {selected && deleteConfirmOpen ? (
        <ConfirmationModal
          title="Delete therapist"
          description={`Are you sure you want to delete "${selected.name}"? This cannot be undone.`}
          confirmLabel="Yes, delete"
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            deleteTherapist(selected.id);
            setDeleteConfirmOpen(false);
          }}
        />
      ) : null}

      {selected && editOpen ? (
        <EditTherapistProfileModal
          profile={selectedProfile}
          onClose={() => setEditOpen(false)}
          onDelete={() => {
            if (!selected) return;
            setEditOpen(false);
            deleteTherapist(selected.id);
          }}
          onSave={(next) => {
            const phone = [next.phoneCountry.trim(), next.phoneNumber.trim()].filter(Boolean).join(" ");
            // Persist profile fields via users API (profiles table).
            void fetch(`/api/v1/admin/users/${next.id}`, {
              method: "PUT",
              cache: "no-store",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                fullName: next.fullName,
                phone: phone || undefined,
              }),
            });
            // Persist therapist fields via therapists API (limited fields supported today).
            void fetch(`/api/v1/admin/therapists/${next.id}`, {
              method: "PUT",
              cache: "no-store",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                visibility: next.hidden ? "private" : "public",
                bio: next.aboutYou,
              }),
            });
            updateProfile(next);
          }}
        />
      ) : null}

      {createOpen ? (
        <CreateTherapistModal
          onClose={() => setCreateOpen(false)}
          onCreate={async (draft) => {
            // Create a profile entry first, then create therapist profile.
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
            const userJson = (await userRes.json()) as any;
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
            const tJson = (await tRes.json()) as any;
            if (!tRes.ok || tJson?.status !== "success") {
              throw new Error(tJson?.message || `Failed to create therapist (HTTP ${tRes.status})`);
            }

            // Optimistically add to list.
            setTherapists((prev) => [
              {
                id: userId,
                name: draft.fullName,
                email: draft.email,
                specialty: draft.specialization,
                status: draft.hidden ? "Inactive" : "Active",
                timezone: normalizeTimeZone(draft.timezone),
              },
              ...prev,
            ]);
            setProfilesById((prev) => ({ ...prev, [userId]: { ...draft, id: userId } }));
            setSelectedId(userId);
          }}
        />
      ) : null}
    </div>
  );
}

