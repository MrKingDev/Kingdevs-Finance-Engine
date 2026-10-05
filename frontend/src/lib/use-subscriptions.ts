"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, apiError } from "@/lib/finance-api";
import type { SubscriptionOverview } from "@/types/api";

export function useSubscriptions(includeArchived: boolean) {
  const [data, setData] = useState<SubscriptionOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    window.addEventListener("finance-data-changed", refresh);
    window.addEventListener("focus", refresh);
    let day = new Date().toISOString().slice(0, 10);
    const timer = window.setInterval(() => {
      const nextDay = new Date().toISOString().slice(0, 10);
      if (nextDay !== day) { day = nextDay; refresh(); }
    }, 60_000);
    return () => {
      window.removeEventListener("finance-data-changed", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    void revision;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const response = await fetch(`${API_URL}/subscriptions/overview?include_archived=${includeArchived}`, {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error(await apiError(response, "Unable to load subscriptions."));
        const result: SubscriptionOverview = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to load subscriptions.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [includeArchived, revision]);

  return { data, error, loading, refresh };
}
