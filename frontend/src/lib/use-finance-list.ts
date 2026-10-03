"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, apiError } from "@/lib/finance-api";

export function useFinanceList<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    window.addEventListener("finance-data-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("finance-data-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision intentionally triggers a new request after writes or window focus.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const response = await fetch(`${API_URL}${path}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(
            await apiError(response, "Unable to load financial data."),
          );
        const result: T[] = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load financial data.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [path, revision]);

  return { data, loading, error, refresh };
}
