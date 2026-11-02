"use client";

import { FileJson, LoaderCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";

type BrowserData = Record<string, string | null>;
type BackupPreview = {
  counts: Record<string, { new: number; skipped: number }>;
  browser_data: BrowserData;
  exported_at?: string;
};

const labels: Record<string, string> = {
  categories: "Categories",
  bank_styles: "Bank preferences",
  transactions: "Transactions",
  budgets: "Budgets",
  transaction_rules: "Import rules",
  goals: "Goals",
  goal_entries: "Goal entries",
  subscriptions: "Subscriptions",
  subscription_payments: "Subscription payments",
};

function browserChanges(data: BrowserData) {
  const changes: Record<string, string> = {};
  for (const key of ["what-to-buy-budget", "theme"]) {
    if (
      data[key] !== null &&
      data[key] !== undefined &&
      localStorage.getItem(key) === null
    ) {
      changes[key] = data[key];
    }
  }
  if (
    data["what-to-buy-items"] !== null &&
    data["what-to-buy-items"] !== undefined
  ) {
    const current = JSON.parse(
      localStorage.getItem("what-to-buy-items") ?? "[]",
    ) as { id: string }[];
    if (!Array.isArray(current))
      throw new Error(
        "Your saved wish list could not be read. No backup was imported.",
      );
    const incoming = JSON.parse(data["what-to-buy-items"]) as { id: string }[];
    const ids = new Set(current.map((item) => item.id));
    const additions = incoming.filter((item) => !ids.has(item.id));
    if (additions.length)
      changes["what-to-buy-items"] = JSON.stringify([...current, ...additions]);
  }
  return changes;
}

export default function BackupImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(false);
  const { setTheme } = useTheme();

  async function upload(importing: boolean) {
    if (!file || active.current || (importing && !preview)) return;
    if (!file.name.toLowerCase().endsWith(".json") || file.size > 50_000_000) {
      setError("Choose a Finance Engine .json backup no larger than 50 MB.");
      return;
    }
    active.current = true;
    setBusy(importing ? "import" : "preview");
    setError(null);
    setMessage(null);
    let saved = false;
    try {
      // Check browser access before saving database records. Existing browser
      // preferences are kept; incoming nulls never erase local data.
      if (importing && preview) browserChanges(preview.browser_data);
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `${API_URL}/imports/backup${importing ? "" : "/preview"}`,
        { method: "POST", body },
      );
      if (!response.ok)
        throw new Error(
          await apiError(response, "Unable to import this backup."),
        );
      const result: BackupPreview = await response.json();
      if (!importing) {
        setPreview(result);
        return;
      }
      saved = true;
      notifyFinanceChanged();
      for (const [key, value] of Object.entries(
        browserChanges(result.browser_data),
      )) {
        localStorage.setItem(key, value);
        if (key === "theme") setTheme(value);
      }
      const added = Object.values(result.counts).reduce(
        (sum, count) => sum + count.new,
        0,
      );
      const skipped = Object.values(result.counts).reduce(
        (sum, count) => sum + count.skipped,
        0,
      );
      setMessage(
        `Saved ${added.toLocaleString()} records. Skipped ${skipped.toLocaleString()} existing records. Your data will stay saved when you close the app.`,
      );
      setPreview(null);
      setFile(null);
      if (input.current) input.current.value = "";
    } catch (failure) {
      const detail =
        failure instanceof Error
          ? failure.message
          : "Unable to import this backup.";
      setError(
        saved
          ? `Database records were saved, but browser preferences could not be restored. Retry the import to finish; existing records will be skipped. ${detail}`
          : detail,
      );
    } finally {
      setBusy(null);
      active.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Restore the JSON file from Download All Data. New records are added and
        matching records are skipped. Your existing budgets, goals,
        subscriptions, and preferences keep their current values.
      </p>
      <div className="max-w-lg space-y-2">
        <Label htmlFor="backup-file">JSON backup</Label>
        <Input
          id="backup-file"
          ref={input}
          type="file"
          accept=".json,application/json"
          disabled={busy !== null}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setMessage(null);
            setError(null);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Up to 50 MB. Preview validates the whole file before anything is
          saved.
        </p>
      </div>
      <Button
        variant="outline"
        isDisabled={!file || busy !== null}
        onPress={() => void upload(false)}
      >
        {busy === "preview" ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <FileJson />
        )}
        {busy === "preview" ? "Checking Backup..." : "Preview Backup"}
      </Button>
      {preview && (
        <div className="space-y-4">
          {preview.exported_at && (
            <p className="text-sm text-muted-foreground">
              Backup created {new Date(preview.exported_at).toLocaleString()}.
            </p>
          )}
          <div className="max-w-2xl overflow-x-auto rounded-lg border">
            <table
              className="w-full text-sm"
              aria-label="Backup import preview"
            >
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-right">New</th>
                  <th className="px-4 py-2 text-right">Already saved</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(preview.counts).map(([key, count]) => (
                  <tr className="border-t" key={key}>
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      {labels[key] ?? key}
                    </th>
                    <td className="px-4 py-2 text-right">
                      {count.new.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {count.skipped.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Saved wish list items are also merged. Existing browser preferences
            are kept.
          </p>
          <Button isDisabled={busy !== null} onPress={() => void upload(true)}>
            {busy === "import" && <LoaderCircle className="animate-spin" />}
            {busy === "import"
              ? "Importing & Saving..."
              : "Import & Save Backup"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <output className="block text-sm text-muted-foreground">
          {message}
        </output>
      )}
    </div>
  );
}
