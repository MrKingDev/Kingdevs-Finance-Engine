"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { I18nProvider } from "react-aria-components";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import {
  defaultPreferences,
  type RegionalPreferences,
  regionalFormat,
} from "@/lib/regional-format";

type Options = Record<keyof RegionalPreferences, Record<string, string>>;
type PreferencesContext = {
  preferences: RegionalPreferences;
  options: Options | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  save: (value: RegionalPreferences) => Promise<void>;
};
const Context = createContext<PreferencesContext | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const responses = await Promise.all([
        fetch(`${API_URL}/preferences`, { cache: "no-store" }),
        fetch(`${API_URL}/preferences/options`, { cache: "no-store" }),
      ]);
      for (const response of responses) {
        if (!response.ok)
          throw new Error(
            await apiError(response, "Unable to load preferences."),
          );
      }
      const [saved, choices] = await Promise.all(
        responses.map((response) => response.json()),
      );
      if (requestId.current === id) {
        setPreferences((current) =>
          current.locale === saved.locale &&
          current.currency === saved.currency &&
          current.time_zone === saved.time_zone
            ? current
            : saved,
        );
        setOptions(choices);
        setError("");
      }
    } catch (failure) {
      if (requestId.current === id)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to load preferences.",
        );
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener("finance-data-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      ++requestId.current;
      window.removeEventListener("finance-data-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const save = useCallback(async (value: RegionalPreferences) => {
    ++requestId.current;
    const response = await fetch(`${API_URL}/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!response.ok)
      throw new Error(await apiError(response, "Unable to save preferences."));
    setPreferences(await response.json());
    setError("");
    notifyFinanceChanged();
  }, []);

  return (
    <Context.Provider
      value={{ preferences, options, loading, error, refresh, save }}
    >
      <I18nProvider locale={preferences.locale}>{children}</I18nProvider>
    </Context.Provider>
  );
}

export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("PreferencesProvider is required.");
  return context;
}

export function useRegionalFormat() {
  const { preferences } = usePreferences();
  return useMemo(() => regionalFormat(preferences), [preferences]);
}
