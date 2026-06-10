"use client";

import Link from "next/link";
import { useState } from "react";
import TherapistDetailModal, { type TherapistDetail } from "@/components/landing/TherapistDetailModal";

const THERAPISTS: Array<
  TherapistDetail & {
    preview: string;
  }
> = [
  {
    name: "Suhaila Shafeek- Irshad (GR)",
    role: "Clinical Psychologist",
    badge: "Licensed Clinical Psychologist",
    specialization:
      "Areas of Specialization: emotional difficulties, intrapersonal conflict, relationship issues and trauma",
    languages: "Languages : English, Sinhala & Tamil",
    preview: "Areas of Specialization: emotional...",
  },
  {
    name: "Giselle Dass (ZR)",
    role: "Child and Adolescent Psychologist",
    badge: "Child and Adolescent Psychologist",
    specialization:
      "Areas of Specialization: emotional regulation, developmental concerns, family systems, and adolescent mental health.",
    languages: "Languages : English & Sinhala",
    preview: "Areas of Specialization: Emotional...",
  },
];

export default function TherapistsSection() {
  const [active, setActive] = useState<TherapistDetail | null>(null);

  return (
    <>
      <section id="therapists" className="space-y-6">
        <h2 className="text-xl font-bold">Therapists</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {THERAPISTS.map((t) => (
            <TherapistCard
              key={t.name}
              name={t.name}
              role={t.role}
              badge={t.badge}
              preview={t.preview}
              onShowMore={() =>
                setActive({
                  name: t.name,
                  role: t.role,
                  badge: t.badge,
                  specialization: t.specialization,
                  languages: t.languages,
                  avatarSrc: t.avatarSrc,
                })
              }
            />
          ))}
        </div>
      </section>

      <TherapistDetailModal open={active !== null} onClose={() => setActive(null)} therapist={active} />
    </>
  );
}

function TherapistCard({
  name,
  role,
  badge,
  preview,
  onShowMore,
}: {
  name: string;
  role: string;
  badge: string;
  preview: string;
  onShowMore: () => void;
}) {
  const servicesHref = `/services?${new URLSearchParams({ therapist: name }).toString()}`;
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-card p-6">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dark-border bg-black/40">
          <UserIcon className="h-7 w-7 text-gray-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold">{name}</h3>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-y border-dark-border py-3">
        <span className="min-w-0 flex-1 text-xs font-medium leading-snug">{badge}</span>
        <Link
          href={servicesHref}
          className="shrink-0 rounded-md p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500/50"
          aria-label={`View services for ${name}`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs text-gray-400">{preview}</p>
        <button
          type="button"
          onClick={onShowMore}
          className="text-xs font-medium text-white underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          See more
        </button>
      </div>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    </svg>
  );
}
