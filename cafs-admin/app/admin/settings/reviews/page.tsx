"use client";

import { useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ReviewTab = "reviews" | "preferences";

type DummyReview = {
  id: string;
  customerName: string;
  rating: number;
  body: string;
  dateLabel: string;
};

const DUMMY_REVIEWS: DummyReview[] = [
  {
    id: "1",
    customerName: "Amaya Perera",
    rating: 5,
    body: "Wonderful experience from booking to the session. Clear communication and a calm, professional space.",
    dateLabel: "Mar 2, 2025",
  },
  {
    id: "2",
    customerName: "Rohan Silva",
    rating: 5,
    body: "Easy to reschedule online. The therapist was punctual and the online link worked without any hassle.",
    dateLabel: "Feb 18, 2025",
  },
  {
    id: "3",
    customerName: "Nethmi Fernando",
    rating: 4,
    body: "Very helpful first appointment. Would love slightly longer slots next time, but overall highly recommend.",
    dateLabel: "Feb 4, 2025",
  },
  {
    id: "4",
    customerName: "Dilan Jayawardena",
    rating: 5,
    body: "Professional service and great follow-up reminders. The booking page made it simple to find a time that worked.",
    dateLabel: "Jan 21, 2025",
  },
];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  const t = parts[0]?.trim() ?? "?";
  return t.slice(0, 2).toUpperCase();
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <MaterialSymbol
          key={i}
          name="star"
          filled={i < rating}
          className={cx("text-[18px]", i < rating ? "text-mgmt-on-surface" : "text-mgmt-outline-variant/60")}
        />
      ))}
    </div>
  );
}

export default function AdminSettingsReviewsPage() {
  const [tab, setTab] = useState<ReviewTab>("reviews");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-mgmt-surface-container-lowest">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <header className="border-b border-mgmt-outline-variant/15 pb-0">
          <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <nav className="flex gap-8" aria-label="Reviews sections">
              <button
                type="button"
                onClick={() => setTab("reviews")}
                className={cx(
                  "pb-4 text-sm font-semibold transition-colors",
                  tab === "reviews"
                    ? "border-b-2 border-mgmt-on-surface text-mgmt-on-surface"
                    : "border-b-2 border-transparent text-mgmt-on-surface-variant hover:text-mgmt-on-surface",
                )}
              >
                Reviews
              </button>
              <button
                type="button"
                onClick={() => setTab("preferences")}
                className={cx(
                  "pb-4 text-sm font-semibold transition-colors",
                  tab === "preferences"
                    ? "border-b-2 border-mgmt-on-surface text-mgmt-on-surface"
                    : "border-b-2 border-transparent text-mgmt-on-surface-variant hover:text-mgmt-on-surface",
                )}
              >
                Preferences
              </button>
            </nav>
          </div>
        </header>

        {tab === "reviews" ? (
          <div className="mt-8 space-y-0">
            <p className="mb-6 text-sm text-mgmt-on-surface-variant">
              Reviews from your customers can appear on your Booking Page when enabled in preferences.
            </p>
            <ul className="divide-y divide-mgmt-outline-variant/15 border-t border-b border-mgmt-outline-variant/15">
              {DUMMY_REVIEWS.map((r) => (
                <li key={r.id} className="flex gap-4 py-6">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mgmt-tertiary-container text-xs font-bold text-mgmt-on-tertiary-container"
                    aria-hidden
                  >
                    {initialsFor(r.customerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold text-mgmt-on-surface">{r.customerName}</p>
                      <span className="text-xs text-mgmt-on-surface-variant">{r.dateLabel}</span>
                    </div>
                    <div className="mt-1">
                      <StarRow rating={r.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-mgmt-on-surface">{r.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <button
                type="button"
                className="rounded-full border-2 border-mgmt-on-surface bg-mgmt-surface-container-lowest px-6 py-2.5 text-sm font-semibold text-mgmt-on-surface transition-colors hover:bg-mgmt-surface-container-low"
              >
                Request review
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            <h2 className="text-lg font-bold text-mgmt-on-surface">Preferences</h2>
            <p className="text-sm leading-relaxed text-mgmt-on-surface-variant">
              Control how reviews are collected, moderated, and displayed on your Booking Page. Detailed
              controls will connect here.
            </p>
            <div className="rounded-xl border border-mgmt-outline-variant/15 bg-mgmt-surface-container-low px-4 py-8 text-center">
              <MaterialSymbol name="tune" className="mx-auto text-[40px] text-mgmt-on-surface-variant/50" />
              <p className="mt-3 text-sm font-semibold text-mgmt-on-surface">Review display settings</p>
              <p className="mt-1 text-sm text-mgmt-on-surface-variant">Coming soon — match your workflow to this tab.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
