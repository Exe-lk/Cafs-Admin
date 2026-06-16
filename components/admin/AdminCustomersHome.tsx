"use client";

import { useEffect, useMemo, useState } from "react";
import MaterialSymbol from "@/components/admin/MaterialSymbol";
import AdminCustomerDetail, { type AdminCustomerModel } from "@/components/admin/AdminCustomerDetail";
import { adminSidebarInsetLeft } from "@/components/admin/adminSidebarLayout";
import { SECONDARY_NAV_HEADING_CLASS } from "@/components/admin/secondaryNavLayout";
import CreateCustomerModal from "@/components/admin/CreateCustomerModal";
import {
  buildAdminAppointmentDays,
  buildCustomerStatsFromAppointments,
  lastActivityFromAppointments,
  type ClientAppointmentListItem,
} from "@/lib/admin/clientAppointments";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function listInitial(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

export default function AdminCustomersHome() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [customers, setCustomers] = useState<AdminCustomerModel[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileCustomerOpen, setMobileCustomerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg(null);
    (async () => {
      try {
        const sp = new URLSearchParams();
        sp.set("page", "1");
        sp.set("limit", "100");
        if (query.trim()) sp.set("q", query.trim());

        const res = await fetch(`/api/v1/admin/clients?${sp.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as any;
        if (!res.ok || json?.status !== "success" || !json?.data) {
          throw new Error(json?.message || `Failed to load customers (HTTP ${res.status})`);
        }

        const items = (json.data.items ?? []) as Array<any>;
        const nextCustomers: AdminCustomerModel[] = items.map((c) => ({
          id: String(c.clientId),
          fullName: String(c.fullName ?? ""),
          phone: String(c.phone ?? ""),
          email: String(c.email ?? ""),
          company: "",
          address: "",
          cityStateLine: "—",
          country: "Sri Lanka",
          memberSinceLine: "—",
          statusLabel: c.isActive === false ? "Inactive" : "Active",
          tierLabel: "—",
          stats: { totalBookings: 0, cancellations: 0, ltvUsd: 0 },
          localTimeDisplay: "—",
          lastActivity: "—",
          appointmentDays: [],
          notesHistory: [],
          avatarUrl: null,
        }));

        setCustomers(nextCustomers);
        setSelectedId((prev) => prev || nextCustomers[0]?.id || "");
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load customers");
        setCustomers([]);
        setSelectedId("");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const selected = useMemo(() => {
    const match = filtered.find((c) => c.id === selectedId);
    return match ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId || loading) return;

    const ac = new AbortController();
    const clientId = selectedId;

    void (async () => {
      try {
        const sp = new URLSearchParams();
        sp.set("clientId", clientId);
        const res = await fetch(`/api/v1/admin/appointments/list?${sp.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json()) as {
          status?: string;
          message?: string;
          data?: { items?: ClientAppointmentListItem[] };
        };
        if (!res.ok || json?.status !== "success") {
          throw new Error(json?.message || `Failed to load appointments (HTTP ${res.status})`);
        }

        const items = json.data?.items ?? [];
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== clientId) return c;
            return {
              ...c,
              appointmentDays: buildAdminAppointmentDays(items, c.fullName),
              stats: buildCustomerStatsFromAppointments(items),
              lastActivity: lastActivityFromAppointments(items),
            };
          }),
        );
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== clientId) return c;
            return {
              ...c,
              appointmentDays: [],
              lastActivity: "Could not load appointments",
            };
          }),
        );
      }
    })();

    return () => ac.abort();
  }, [selectedId, loading]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-mgmt-surface-container-lowest">
      {/* Desktop: fixed full-height customer list column */}
      <div
        className={cx(
          "hidden overflow-hidden border-r border-mgmt-outline-variant/10 bg-mgmt-surface-container-lowest lg:fixed lg:top-0 lg:z-40 lg:flex lg:h-full lg:w-72 lg:flex-col",
          adminSidebarInsetLeft("lg"),
        )}
        data-purpose="customers-list-fixed"
      >
      <section className="flex min-h-0 flex-1 flex-col bg-mgmt-surface-container-lowest">
        <header className="shrink-0 px-6 pb-4 pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={SECONDARY_NAV_HEADING_CLASS}>Customers</h2>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-surface-container-lowest shadow-md transition-transform hover:bg-mgmt-on-background active:scale-95"
              onClick={() => setCreateOpen(true)}
              aria-label="Add customer"
            >
              <MaterialSymbol name="add" className="text-[22px]" />
            </button>
          </div>
          <div className="relative">
            <MaterialSymbol
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-mgmt-on-surface-variant"
            />
            <input
              className="h-10 w-full rounded-lg border border-mgmt-outline-variant/30 bg-mgmt-surface-container-lowest py-2 pr-4 pl-10 text-sm text-mgmt-on-surface transition-all placeholder:text-mgmt-on-surface-variant focus:border-mgmt-primary/40 focus:ring-2 focus:ring-mgmt-primary/15 focus:outline-none"
              placeholder="Search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search customers"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-6 py-8 text-center text-sm text-mgmt-on-surface-variant">Loading…</p>
          ) : errorMsg ? (
            <p className="px-6 py-8 text-center text-sm text-red-700">{errorMsg}</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-mgmt-on-surface-variant">
              No customers match your search.
            </p>
          ) : (
            filtered.map((c) => {
              const isActive = selected && c.id === selected.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cx(
                    "flex w-full cursor-pointer items-center gap-3 px-6 py-4 text-left transition-colors",
                    isActive
                      ? "bg-mgmt-surface-container-low"
                      : "hover:bg-mgmt-surface-container-low/60",
                  )}
                >
                  <div
                    className={cx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      isActive
                        ? "bg-[#E7E7E7] text-[#5F5F5F]"
                        : "bg-[#E7E7E7] text-[#5F5F5F]",
                    )}
                  >
                    {listInitial(c.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-mgmt-on-surface">{c.fullName}</p>
                    {/* <p className="truncate text-xs text-mgmt-on-surface-variant">{c.email}</p> */}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
      </div>
      <div className="hidden w-72 shrink-0 lg:block" aria-hidden />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-mgmt-surface-container-lowest">
        {/* Mobile: customer selector + search */}
        <div className="mb-4 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setMobileCustomerOpen((o) => !o)}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-mgmt-outline-variant bg-mgmt-surface-container-lowest px-4 text-sm font-semibold text-mgmt-on-surface"
                aria-haspopup="menu"
                aria-expanded={mobileCustomerOpen}
              >
                <span className="min-w-0 truncate">
                  {selected ? selected.fullName : "Select customer"}
                </span>
                <MaterialSymbol
                  name="expand_more"
                  className={cx(
                    "text-[20px] text-mgmt-on-surface-variant transition-transform",
                    mobileCustomerOpen && "rotate-180",
                  )}
                />
              </button>

              <div
                className={cx(
                  "absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-mgmt-outline-variant bg-white shadow-lg",
                  mobileCustomerOpen ? "block" : "hidden",
                )}
                role="menu"
              >
                <div className="border-b border-mgmt-outline-variant/20 p-3">
                  <div className="relative">
                    <MaterialSymbol
                      name="search"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-mgmt-on-surface-variant"
                    />
                    <input
                      className="w-full rounded-lg border-none bg-mgmt-surface-container-low py-2 pr-3 pl-10 text-sm text-mgmt-on-surface placeholder:text-mgmt-on-surface-variant focus:bg-mgmt-surface-container-lowest focus:ring-1 focus:ring-mgmt-primary focus:outline-none"
                      placeholder="Search customers..."
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search customers"
                    />
                  </div>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {loading ? (
                    <p className="px-4 py-6 text-center text-sm text-mgmt-on-surface-variant">
                      Loading…
                    </p>
                  ) : errorMsg ? (
                    <p className="px-4 py-6 text-center text-sm text-red-700">{errorMsg}</p>
                  ) : filtered.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-mgmt-on-surface-variant">
                      No customers match your search.
                    </p>
                  ) : (
                    filtered.map((c) => {
                      const isActive = selected && c.id === selected.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(c.id);
                            setMobileCustomerOpen(false);
                          }}
                          className={cx(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                            isActive ? "bg-mgmt-surface-container-low" : "hover:bg-mgmt-surface-container-low",
                          )}
                          role="menuitem"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mgmt-surface-container-high text-sm font-bold text-mgmt-on-surface-variant">
                            {listInitial(c.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-mgmt-on-surface">{c.fullName}</p>
                            <p className="truncate text-xs text-mgmt-on-surface-variant">{c.email}</p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mgmt-on-surface text-mgmt-surface-container-lowest shadow-md transition-transform hover:bg-mgmt-on-background active:scale-95"
              onClick={() => setCreateOpen(true)}
              aria-label="Add customer"
            >
              <MaterialSymbol name="add" className="text-[22px]" />
            </button>
          </div>
          <p className="mt-2 text-xs text-mgmt-on-surface-variant">
            Choose a customer to view details.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
        {selected ? (
          <AdminCustomerDetail
            key={selected.id}
            customer={selected}
            onPersistProfile={async ({ clientId, fullName, phone }) => {
              const res = await fetch(`/api/v1/admin/clients/${clientId}`, {
                method: "PUT",
                cache: "no-store",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ fullName, phone }),
              });
              const json = (await res.json()) as any;
              if (!res.ok || json?.status !== "success") {
                throw new Error(json?.message || `Update failed (HTTP ${res.status})`);
              }
            }}
            onUpdateCustomer={(next) => {
              setCustomers((prev) => prev.map((c) => (c.id === next.id ? next : c)));
            }}
            onDeleteCustomer={(customerId) => {
              setCustomers((prev) => prev.filter((c) => c.id !== customerId));
              setSelectedId((prevSelected) => (prevSelected === customerId ? "" : prevSelected));
            }}
          />
        ) : (
          <p className="px-6 py-8 text-sm text-mgmt-on-surface-variant">Select a customer.</p>
        )}
        </div>
      </section>

      {createOpen ? (
        <CreateCustomerModal
          onClose={() => setCreateOpen(false)}
          onCreate={async (draft) => {
            setErrorMsg(null);
            try {
              const res = await fetch("/api/v1/admin/clients", {
                method: "POST",
                cache: "no-store",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  fullName: draft.fullName,
                  email: draft.email || undefined,
                  phone: draft.phone || undefined,
                }),
              });
              const json = (await res.json()) as any;
              if (!res.ok || json?.status !== "success") {
                throw new Error(json?.message || `Create failed (HTTP ${res.status})`);
              }
              const clientId = String(json?.data?.clientId ?? "");
              if (!clientId) throw new Error("Create succeeded but no clientId returned");

              const next: AdminCustomerModel = {
                ...draft,
                id: clientId,
                avatarUrl: draft.avatarUrl ?? null,
                cityStateLine: "—",
                memberSinceLine: "New customer",
                statusLabel: "Active",
                tierLabel: "—",
                stats: { totalBookings: 0, cancellations: 0, ltvUsd: 0 },
                localTimeDisplay: "—",
                lastActivity: "Just added",
                appointmentDays: [],
                notesHistory: [],
              };
              setCustomers((prev) => [next, ...prev]);
              setSelectedId(clientId);
            } catch (e) {
              setErrorMsg(e instanceof Error ? e.message : "Failed to create customer");
            }
          }}
        />
      ) : null}
    </div>
  );
}

