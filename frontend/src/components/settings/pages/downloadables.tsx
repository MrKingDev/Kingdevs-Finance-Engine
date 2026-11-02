"use client";

import {
  DatabaseBackupIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL, apiError } from "@/lib/finance-api";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
type ExportKind = "csv" | "styled" | "basic" | "backup";

export default function Downloadables() {
  const [period, setPeriod] = useState<{ month: number; year: number } | null>(
    null,
  );
  const [years, setYears] = useState<number[]>([]);
  const [downloading, setDownloading] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeDownload = useRef<AbortController | null>(null);

  useEffect(() => {
    // A client-local date after mount keeps the server and first client render identical.
    const now = new Date();
    setPeriod({ month: now.getMonth() + 1, year: now.getFullYear() });
    const defaultYears = Array.from(
      { length: Math.max(now.getFullYear() - 2000 + 2, 1) },
      (_, index) => now.getFullYear() + 1 - index,
    );
    setYears(defaultYears);
    const controller = new AbortController();
    async function loadYears() {
      try {
        const response = await fetch(`${API_URL}/exports/periods`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(
            await apiError(response, "Unable to load saved report years."),
          );
        const result: { years: number[] } = await response.json();
        if (!controller.signal.aborted)
          setYears(
            [...new Set([...defaultYears, ...result.years])].sort(
              (a, b) => b - a,
            ),
          );
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to reach the backend.",
          );
      }
    }
    void loadYears();
    return () => {
      controller.abort();
      activeDownload.current?.abort();
      activeDownload.current = null;
    };
  }, []);

  async function download(kind: ExportKind) {
    if ((kind !== "backup" && !period) || activeDownload.current) return;
    const controller = new AbortController();
    activeDownload.current = controller;
    setDownloading(kind);
    setError(null);
    setMessage(null);
    const suffix = period
      ? `${String(period.year).padStart(4, "0")}-${String(period.month).padStart(2, "0")}`
      : "";
    const filename =
      kind === "backup"
        ? `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
        : kind === "csv"
          ? `finance-transactions-${suffix}.csv`
          : `finance-report-${suffix}-${kind}.pdf`;
    const query = new URLSearchParams(
      period && kind !== "backup"
        ? {
            month: String(period.month),
            year: String(period.year),
          }
        : {},
    );
    if (kind === "styled" || kind === "basic") query.set("style", kind);
    const endpoint =
      kind === "backup"
        ? "backup.json"
        : kind === "csv"
          ? "transactions.csv"
          : "report.pdf";
    try {
      const response = await fetch(`${API_URL}/exports/${endpoint}?${query}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          await apiError(response, "Unable to generate this download."),
        );
      const expectedType =
        kind === "backup"
          ? "application/json"
          : kind === "csv"
            ? "text/csv"
            : "application/pdf";
      if (!response.headers.get("Content-Type")?.includes(expectedType))
        throw new Error(
          "The backend returned an unexpected file format. Please try again.",
        );
      let blob: Blob;
      if (kind === "backup") {
        const backup = await response.json();
        // These are the application's only persistent browser settings/data.
        // Keep their original strings so values can be restored without loss.
        backup.browser_data = Object.fromEntries(
          ["what-to-buy-items", "what-to-buy-budget", "theme"].map((key) => [
            key,
            localStorage.getItem(key),
          ]),
        );
        blob = new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        });
      } else {
        blob = await response.blob();
      }
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow the browser to consume the object URL before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`Download ready: ${filename}`);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to download. Check that the backend is running.",
        );
    } finally {
      if (!controller.signal.aborted) setDownloading(null);
      if (activeDownload.current === controller) activeDownload.current = null;
    }
  }

  const disabled = !period || downloading !== null;

  return (
    <div className="space-y-5">
      <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <Select
            aria-label="Report month"
            selectedKey={period ? String(period.month) : null}
            isDisabled={disabled}
            placeholder="Select month"
            className="w-full"
            onSelectionChange={(key) => {
              if (key !== null && period) {
                setPeriod({ ...period, month: Number(key) });
                setMessage(null);
              }
            }}
          >
            <FieldLabel>Month</FieldLabel>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem id={String(index + 1)} key={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <Select
            aria-label="Report year"
            selectedKey={period ? String(period.year) : null}
            isDisabled={disabled}
            placeholder="Select year"
            className="w-full"
            onSelectionChange={(key) => {
              if (key !== null && period) {
                setPeriod({ ...period, year: Number(key) });
                setMessage(null);
              }
            }}
          >
            <FieldLabel>Year</FieldLabel>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem id={String(year)} key={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">
        Export saved transactions for{" "}
        {period
          ? `${MONTHS[period.month - 1]} ${period.year}`
          : "your selected month"}
        . PDF totals are in USD.
      </p>
      <div className="flex flex-wrap gap-3" aria-busy={downloading !== null}>
        <Button
          variant="outline"
          isDisabled={disabled}
          onPress={() => void download("csv")}
        >
          {downloading === "csv" ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <FileSpreadsheetIcon />
          )}
          {downloading === "csv" ? "Preparing CSV..." : "Download CSV"}
        </Button>
        <Button isDisabled={disabled} onPress={() => void download("styled")}>
          {downloading === "styled" ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <DownloadIcon />
          )}
          {downloading === "styled" ? "Preparing PDF..." : "Download PDF"}
        </Button>
        <Button
          variant="outline"
          isDisabled={disabled}
          onPress={() => void download("basic")}
        >
          {downloading === "basic" ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <FileTextIcon />
          )}
          {downloading === "basic"
            ? "Preparing Basic PDF..."
            : "Download Basic PDF"}
        </Button>
      </div>
      <div className="space-y-3 border-t pt-5">
        <h3 className="font-medium">Complete data backup</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Download all transactions, budgets, categories, goals and entries,
          subscriptions and payment history, import rules, and bank preferences
          as JSON. Includes all months and years, plus this browser's wish list
          and theme.
        </p>
        <Button
          variant="outline"
          isDisabled={downloading !== null}
          onPress={() => void download("backup")}
        >
          {downloading === "backup" ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <DatabaseBackupIcon />
          )}
          {downloading === "backup"
            ? "Preparing Backup..."
            : "Download All Data"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <output className="block text-sm text-muted-foreground">{message}</output>
    </div>
  );
}
