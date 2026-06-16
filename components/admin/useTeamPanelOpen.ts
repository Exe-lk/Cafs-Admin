"use client";

import { useCallback, useEffect, useState } from "react";

export const TEAM_PANEL_OPEN_KEY = "admin-team-panel-open";

export function useTeamPanelOpen(defaultOpen = true) {
  const [open, setOpenState] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEAM_PANEL_OPEN_KEY);
      if (stored !== null) setOpenState(stored === "true");
    } catch {
      // ignore storage errors
    }
  }, []);

  const setOpen = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(TEAM_PANEL_OPEN_KEY, String(value));
      } catch {
        // ignore storage errors
      }
      return value;
    });
  }, []);

  return [open, setOpen] as const;
}
