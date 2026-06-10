"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export type TherapistDetail = {
  name: string;
  role: string;
  badge: string;
  specialization: string;
  languages: string;
  avatarSrc?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  therapist: TherapistDetail | null;
};

export default function TherapistDetailModal({ open, onClose, therapist }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !therapist) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="therapist-detail-title"
        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-y-auto overscroll-contain rounded-2xl border border-dark-border bg-dark-card p-5 shadow-2xl sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="relative pr-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dark-border bg-black/40">
              {therapist.avatarSrc ? (
                <Image
                  src={therapist.avatarSrc}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-8 w-8 text-gray-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <h2 id="therapist-detail-title" className="text-base font-bold leading-snug text-white">
                    {therapist.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">{therapist.role}</p>
                </div>
                <Link
                  href={`/services?${new URLSearchParams({ therapist: therapist.name }).toString()}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-900 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
                  onClick={onClose}
                >
                  Services
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-400">
          <p>{therapist.badge}</p>
          <p>{therapist.specialization}</p>
          <p>{therapist.languages}</p>
        </div>
      </div>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
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
