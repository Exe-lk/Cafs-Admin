"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import TherapistsDirectoryColumn from "@/components/admin/TherapistsDirectoryColumn";

import AdminCalendarHome from "@/components/admin/AdminCalendarHome";

import CreateTherapistModal from "@/components/admin/CreateTherapistModal";

import { adminSidebarInsetLeft } from "@/components/admin/adminSidebarLayout";

import { useTeamPanelOpen } from "@/components/admin/useTeamPanelOpen";

import { type AdminTherapistListItem, useAdminTherapists } from "@/components/admin/useAdminTherapists";



function cx(...classes: Array<string | false | null | undefined>) {

  return classes.filter(Boolean).join(" ");

}



export default function TheraphistHomePage() {

  const { therapists, loading, refetch } = useAdminTherapists();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [createTherapistOpen, setCreateTherapistOpen] = useState(false);

  const [teamPanelOpen, setTeamPanelOpen] = useTeamPanelOpen(true);
  const hasInitializedSelection = useRef(false);

  useEffect(() => {
    if (hasInitializedSelection.current || therapists.length === 0) return;
    setSelectedIds(therapists.map((t) => t.id));
    hasInitializedSelection.current = true;
  }, [therapists]);



  const selectedTherapists = useMemo(() => {

    const idSet = new Set(selectedIds);

    return therapists.filter((t) => idSet.has(t.id));

  }, [selectedIds, therapists]);



  const primaryTherapist = selectedTherapists[0];



  const therapistsById = useMemo(() => {

    const map: Record<string, AdminTherapistListItem> = {};

    for (const t of therapists) map[t.id] = t;

    return map;

  }, [therapists]);



  return (

    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">

      {/* Mobile: team multi-select */}

      <div className="sticky top-0 z-40 flex max-h-[45vh] min-h-0 flex-col overflow-hidden border-b border-mgmt-outline-variant/10 bg-white/80 backdrop-blur-xl lg:hidden">

        <TherapistsDirectoryColumn

          therapists={therapists}

          selectedIds={selectedIds}

          onSelectedIdsChange={setSelectedIds}

        />

      </div>



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

              selectedIds={selectedIds}

              onSelectedIdsChange={setSelectedIds}

              onAdd={() => setCreateTherapistOpen(true)}

              onCollapse={() => setTeamPanelOpen(false)}

            />

          </div>

          <div className="hidden w-72 shrink-0 lg:block" aria-hidden />

        </>

      ) : null}



      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        <AdminCalendarHome

          therapistIds={selectedIds}

          therapistTimezone={primaryTherapist?.timezone}

          therapistsById={therapistsById}

          onAddTherapist={() => setCreateTherapistOpen(true)}

          teamPanelOpen={teamPanelOpen}

          onOpenTeamPanel={() => setTeamPanelOpen(true)}

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

            setSelectedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));

          }}

        />

      ) : null}

    </div>

  );

}

