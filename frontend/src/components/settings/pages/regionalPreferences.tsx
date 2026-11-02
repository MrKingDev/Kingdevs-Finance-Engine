"use client";

import { type FormEvent, useState } from "react";
import { usePreferences } from "@/components/preferences/preferencesProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type RegionalPreferences,
  regionalFormat,
} from "@/lib/regional-format";

const fields = [
  {
    key: "locale",
    label: "Region",
    hint: "Controls how dates and numbers are displayed.",
  },
  {
    key: "currency",
    label: "Currency",
    hint: "Used for amounts throughout your workspace and PDF reports.",
  },
  {
    key: "time_zone",
    label: "Time zone",
    hint: "Used for today’s date and subscription payment status.",
  },
] as const;

export default function RegionalSettings() {
  const { preferences, options, loading, error, save, refresh } =
    usePreferences();
  const [draft, setDraft] = useState<RegionalPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const selected = draft ?? preferences;
  const preview = regionalFormat(selected);
  const changed = fields.some(({ key }) => selected[key] !== preferences[key]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSaveError("");
    try {
      await save(selected);
      setDraft(null);
      setMessage(
        "Preferences saved. They’ll stay saved when you close the app.",
      );
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Unable to save preferences.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5"
      aria-label="Regional preferences"
    >
      <div>
        <h3 className="font-semibold">Region & currency</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize your financial displays. Changing currency keeps the same
          amounts; it does not convert exchange rates.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading preferences…</p>
      ) : error ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button variant="outline" onPress={refresh}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-3">
            {fields.map(({ key, label, hint }) => (
              <div className="min-w-0 space-y-2" key={key}>
                <Select
                  aria-label={label}
                  selectedKey={selected[key]}
                  isDisabled={saving}
                  className="w-full"
                  onSelectionChange={(value) => {
                    if (value) setDraft({ ...selected, [key]: String(value) });
                    setMessage("");
                    setSaveError("");
                  }}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(options?.[key] ?? {}).map(
                      ([value, name]) => (
                        <SelectItem
                          id={value}
                          key={value}
                          textValue={
                            key === "currency" ? `${value} — ${name}` : name
                          }
                        >
                          {key === "currency" ? `${value} — ${name}` : name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>
          <div
            className="rounded-lg border bg-muted/30 p-4 text-sm"
            data-testid="regional-preview"
          >
            <span className="text-muted-foreground">Preview: </span>
            {preview.formatCurrency(1234.56)} ·{" "}
            {preview.formatDate("2026-11-02")} ·{" "}
            {selected.time_zone.replaceAll("_", " ")}
          </div>
          <Button type="submit" isDisabled={saving || !changed}>
            {saving ? "Saving…" : "Save preferences"}
          </Button>
          {message && (
            <output className="block text-sm text-emerald-700 dark:text-emerald-400">
              {message}
            </output>
          )}
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
        </>
      )}
    </form>
  );
}
