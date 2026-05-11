"use client";

import { useCallback, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";

type Thread = {
  id: string;
  title: string;
  preview: string;
  icon: string;
};

const THREADS: Thread[] = [
  {
    id: "everyone",
    title: "Sam",
    preview: "You: Hi thilia",
    icon: "forest",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminConnectHome() {
  const [activeId, setActiveId] = useState(THREADS[0]?.id ?? "everyone");
  const [draft, setDraft] = useState("");
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false);

  const active = THREADS.find((t) => t.id === activeId) ?? THREADS[0];

  const send = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
  }, [draft]);

  return (
    <div className="flex min-h-dvh w-full bg-mgmt-surface-container-lowest">
      {/* Conversation list */}
      <aside className="hidden w-72 shrink-0 flex-col bg-mgmt-surface-container-lowest md:flex">
        <header className="flex shrink-0 items-center justify-between px-5 py-4">
          <h1 className="text-lg font-semibold text-mgmt-on-surface">Connect</h1>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-on-primary transition-colors hover:bg-mgmt-primary-dim"
            aria-label="New conversation"
          >
            <MaterialSymbol name="add" className="text-[20px]" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {THREADS.map((thread) => {
            const isActive = thread.id === activeId;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setActiveId(thread.id)}
                className={cx(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  isActive ? "bg-mgmt-surface-container-low" : "hover:bg-mgmt-surface-container-low/70",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mgmt-surface-container-high text-mgmt-primary">
                  <MaterialSymbol name={thread.icon} className="text-[22px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-mgmt-on-surface">{thread.title}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-mgmt-on-surface-variant">
                    {thread.preview}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile conversation drawer */}
      <div
        className={cx(
          "fixed inset-0 z-[80] md:hidden",
          mobileThreadsOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileThreadsOpen}
      >
        <button
          type="button"
          className={cx(
            "absolute inset-0 bg-black/35 transition-opacity",
            mobileThreadsOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileThreadsOpen(false)}
          aria-label="Close conversations"
        />
        <div
          className={cx(
            "absolute inset-y-0 left-0 w-[85vw] max-w-[360px] transform transition-transform",
            mobileThreadsOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <aside className="flex h-full w-full flex-col bg-mgmt-surface-container-lowest">
            <header className="flex shrink-0 items-center justify-between px-5 py-4">
              <h1 className="text-lg font-semibold text-mgmt-on-surface">Connect</h1>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-on-primary transition-colors hover:bg-mgmt-primary-dim"
                aria-label="New conversation"
              >
                <MaterialSymbol name="add" className="text-[20px]" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {THREADS.map((thread) => {
                const isActive = thread.id === activeId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setActiveId(thread.id);
                      setMobileThreadsOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      isActive
                        ? "bg-mgmt-surface-container-low"
                        : "hover:bg-mgmt-surface-container-low/70",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mgmt-surface-container-high text-mgmt-primary">
                      <MaterialSymbol name={thread.icon} className="text-[22px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-mgmt-on-surface">{thread.title}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-mgmt-on-surface-variant">
                        {thread.preview}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col bg-mgmt-surface-container-lowest">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileThreadsOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface md:hidden"
              aria-label="Open conversations"
            >
              <MaterialSymbol name="menu" className="text-[22px]" />
            </button>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mgmt-surface-container-high text-mgmt-primary">
              <MaterialSymbol name={active?.icon ?? "forest"} className="text-[22px]" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-mgmt-on-surface">
                {active?.title ?? "Chat"}
              </h2>
              <p className="text-xs text-mgmt-on-surface-variant">2 people</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-full p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
              aria-label="Search"
            >
              <MaterialSymbol name="search" className="text-[22px]" />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-low hover:text-mgmt-on-surface"
              aria-label="More"
            >
              <MaterialSymbol name="more_vert" className="text-[22px]" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-transparent" />
              <span className="shrink-0 text-xs font-medium text-mgmt-on-surface-variant">1 Apr 2028</span>
              <div className="h-px flex-1 bg-transparent" />
            </div>
            <p className="text-center text-sm text-mgmt-on-surface-variant">
              Thilina Dilshan has joined this collab
            </p>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-transparent" />
              <span className="shrink-0 text-xs font-medium text-mgmt-on-surface-variant">Today</span>
              <div className="h-px flex-1 bg-transparent" />
            </div>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mgmt-primary-container text-xs font-bold text-mgmt-on-primary-container">
                T
              </div>
              <div className="min-w-0 rounded-2xl rounded-tl-md border border-mgmt-outline-variant bg-mgmt-surface-container-low px-4 py-3 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-mgmt-on-surface">Sam</span>
                  <span className="text-xs text-mgmt-on-surface-variant">10:31 AM</span>
                </div>
                <p className="text-sm text-mgmt-on-surface">Hi thilia</p>
                <div className="mt-2 flex justify-end">
                  <MaterialSymbol name="done" className="text-[16px] text-mgmt-on-surface-variant" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-40 shrink-0 bg-mgmt-surface-container-lowest px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:px-6 sm:py-4 sm:pb-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-mgmt-outline-variant bg-mgmt-surface-container-low px-2 py-2">
            <button
              type="button"
              className="shrink-0 rounded-full p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-high hover:text-mgmt-on-surface"
              aria-label="Emoji"
            >
              <MaterialSymbol name="sentiment_satisfied" className="text-[22px]" />
            </button>
            <button
              type="button"
              className="shrink-0 rounded-full p-2 text-mgmt-on-surface-variant hover:bg-mgmt-surface-container-high hover:text-mgmt-on-surface"
              aria-label="Attach file"
            >
              <MaterialSymbol name="attach_file" className="text-[22px]" />
            </button>
            <textarea
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:outline-none"
              placeholder="Type a message"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-on-primary transition-colors hover:bg-mgmt-primary-dim disabled:opacity-40"
              aria-label="Send"
              disabled={!draft.trim()}
            >
              <MaterialSymbol name="arrow_upward" className="text-[22px]" />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

