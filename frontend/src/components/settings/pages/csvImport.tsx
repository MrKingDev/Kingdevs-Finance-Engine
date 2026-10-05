"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Category } from "@/types/api";
import { ImportSelect, transactionTypes } from "../import-controls";

type TransactionType = "income" | "expense";
type ExpenseSign = "positive" | "negative" | null;
type DateFormat = "mdy" | "dmy" | "iso";
type MappingField =
  | "date"
  | "merchant"
  | "amount"
  | "debit"
  | "credit"
  | "type"
  | "category";
type ColumnMapping = Record<MappingField, string | null>;
type PreviewRow = {
  row_number: number;
  date: string | null;
  merchant: string;
  amount: string | null;
  type: TransactionType | null;
  source_amount: string;
  source_type: string;
  source_category: string;
  matched_rule: string | null;
  category: string | null;
  duplicate: boolean;
  errors: string[];
};
type Preview = {
  bank: string;
  columns: string[];
  mapping: ColumnMapping;
  rows: PreviewRow[];
  errors: string[];
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  needs_direction: boolean;
  bulk_import: boolean;
  missing_categories: number;
  expense_rows: number;
  income_rows: number;
  first_issue: string | null;
};
const pageSize = 10;
const fieldLabels: Record<MappingField, string> = {
  date: "Date",
  merchant: "Description",
  amount: "Amount",
  debit: "Debit / withdrawal",
  credit: "Credit / deposit",
  type: "Type",
  category: "Category",
};
const dateOptions = [
  { value: "mdy", label: "Month / day / year" },
  { value: "dmy", label: "Day / month / year" },
  { value: "iso", label: "Year-month-day" },
];
const signOptions = [
  { value: "positive", label: "Positive amounts (e.g. 50.00)" },
  { value: "negative", label: "Negative amounts (e.g. -50.00)" },
];
function canSelect(row: PreviewRow) {
  return !row.errors.length && !row.duplicate;
}

function downloadTemplate() {
  const csv =
    "date,merchant,category,bank,type,amount\r\n2026-10-01,Rent,Housing,Example Bank,expense,1200.00\r\n2026-10-02,Salary,Income,Example Bank,income,2500.00\r\n";
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "transaction-import-template.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CSVImport() {
  const categories = useFinanceList<Category>("/categories");
  const [bank, setBank] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dateFormat, setDateFormat] = useState<DateFormat>("mdy");
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [expenseSign, setExpenseSign] = useState<ExpenseSign>(null);
  const [defaultCategory, setDefaultCategory] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<number, TransactionType>>(
    {},
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [stale, setStale] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const categoryOptions = categories.data.map((category) => ({
    value: category.name,
    label: category.name,
    color: category.color,
  }));
  const selectedRows =
    preview?.rows.filter(
      (row) => canSelect(row) && selected.has(row.row_number),
    ) ?? [];
  const missingTypes = selectedRows.filter((row) => !row.type).length;
  const missingCategories = selectedRows.filter(
    (row) =>
      !categories.data.some((category) => category.name === row.category),
  ).length;
  const selectableRows = preview?.rows.filter(canSelect) ?? [];
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selected.has(row.row_number));
  const blocked = !!busy || stale;
  const bulk = preview?.bulk_import ?? false;
  const bulkBlocked = blocked || !preview || !!preview.errors.length ||
    preview.total_rows !== preview.valid_rows || preview.needs_direction ||
    preview.missing_categories > 0 || preview.total_rows === preview.duplicate_rows;

  function invalidatePreview() {
    setStale(true);
    setError(null);
    setMessage(null);
  }

  async function loadPreview({
    sign = expenseSign,
    types = overrides,
    preserve = false,
  }: {
    sign?: ExpenseSign;
    types?: Record<number, TransactionType>;
    preserve?: boolean;
  } = {}) {
    if (busy || !file || !bank.trim()) return;
    setError(null);
    setMessage(null);
    setStale(true);
    if (
      !file.name.toLowerCase().endsWith(".csv") ||
      file.size > 50_000_000
    ) {
      setError("Choose a .csv file no larger than 50 MB (50,000,000 bytes).");
      return;
    }
    setBusy("preview");
    try {
      const body = new FormData();
      body.append("bank", bank.trim());
      body.append("file", file);
      body.append("amount_mode", "auto");
      body.append("date_format", dateFormat);
      body.append("type_overrides", JSON.stringify(types));
      if (sign) body.append("expense_sign", sign);
      if (mapping) body.append("mapping", JSON.stringify(mapping));
      if (defaultCategory) body.append("default_category", defaultCategory);
      const response = await fetch(`${API_URL}/imports/csv/preview`, {
        method: "POST",
        body,
      });
      if (!response.ok)
        throw new Error(await apiError(response, "Unable to read CSV."));
      const result: Preview = await response.json();
      if (preserve && preview) {
        const oldRows = new Map(
          preview.rows.map((row) => [row.row_number, row]),
        );
        result.rows = result.rows.map((row) => ({
          ...row,
          category: oldRows.get(row.row_number)?.category ?? row.category,
        }));
        setSelected(
          (current) =>
            new Set(
              result.rows
                .filter(
                  (row) =>
                    canSelect(row) &&
                    (current.has(row.row_number) ||
                      oldRows.get(row.row_number)?.duplicate),
                )
                .map((row) => row.row_number),
            ),
        );
      } else {
        setSelected(
          new Set(result.rows.filter(canSelect).map((row) => row.row_number)),
        );
        setPage(0);
      }
      setPreview(result);
      setMapping(result.mapping);
      setStale(false);
      if (result.errors.length) setOptionsOpen(true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to read CSV.",
      );
    } finally {
      setBusy(null);
    }
  }

  function assignCategory(category: string | null, rowNumber?: number) {
    setPreview(
      (current) =>
        current && {
          ...current,
          rows: current.rows.map((row) => {
            const apply =
              rowNumber !== undefined
                ? row.row_number === rowNumber
                : selected.has(row.row_number) &&
                  !categories.data.some((item) => item.name === row.category);
            return apply ? { ...row, category } : row;
          }),
        },
    );
  }

  async function importSelected() {
    if (bulk) {
      if (bulkBlocked || !file || !preview) return;
      setBusy("import");
      setError(null);
      setMessage(null);
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("bank", preview.bank);
        body.append("amount_mode", "auto");
        body.append("date_format", dateFormat);
        body.append("mapping", JSON.stringify(preview.mapping));
        if (expenseSign) body.append("expense_sign", expenseSign);
        if (defaultCategory) body.append("default_category", defaultCategory);
        const response = await fetch(`${API_URL}/imports/csv/file`, { method: "POST", body });
        if (!response.ok) throw new Error(await apiError(response, "Unable to import the file."));
        const result: { imported: number; skipped_duplicates: number } = await response.json();
        setMessage(`${result.imported.toLocaleString()} transactions imported. ${result.skipped_duplicates.toLocaleString()} duplicates skipped.`);
        setPreview(null);
        setSelected(new Set());
        notifyFinanceChanged();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Unable to import. Preview again before retrying.");
      } finally {
        setBusy(null);
      }
      return;
    }
    if (
      !preview ||
      blocked ||
      missingCategories ||
      missingTypes ||
      !selectedRows.length
    )
      return;
    setBusy("import");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/imports/csv/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank: preview.bank,
          rows: selectedRows.map(
            ({ row_number, date, merchant, amount, type, category }) => ({
              row_number,
              date,
              merchant,
              amount,
              type,
              category,
            }),
          ),
        }),
      });
      if (!response.ok)
        throw new Error(
          await apiError(response, "Unable to import transactions."),
        );
      const result: { imported: number; skipped_duplicates: number } =
        await response.json();
      setMessage(
        `${result.imported} transactions imported. ${preview.duplicate_rows + result.skipped_duplicates} duplicates skipped.`,
      );
      setPreview(null);
      setSelected(new Set());
      notifyFinanceChanged();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to import transactions.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadPreview();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="csv-bank">Bank name</FieldLabel>
            <Input
              id="csv-bank"
              value={bank}
              required
              maxLength={100}
              disabled={!!busy}
              placeholder="e.g. Bank of America"
              onChange={(event) => {
                setBank(event.target.value);
                invalidatePreview();
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="csv-file">CSV file</FieldLabel>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              required
              disabled={!!busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setMapping(null);
                setExpenseSign(null);
                setDefaultCategory(null);
                setOverrides({});
                setSelected(new Set());
                setOptionsOpen(false);
                invalidatePreview();
              }}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isDisabled={!!busy || !file || !bank.trim()}>
            {busy === "preview" ? "Reading…" : "Preview CSV"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={optionsOpen}
            aria-controls="csv-options"
            isDisabled={!!busy}
            onPress={() => setOptionsOpen((value) => !value)}
          >
            File options
          </Button>
          <span className="text-xs text-muted-foreground">
            UTF-8 CSV · up to 500,000 rows / 50 MB
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Need to reformat your CSV? Ask an LLM to use these columns:{" "}
          <code className="break-all rounded bg-muted px-1 py-0.5">date,merchant,category,bank,type,amount</code>.
          Use YYYY-MM-DD dates, positive amounts, and income or expense for type.
          Keep the original transaction direction and review the preview before importing.
        </p>
        {optionsOpen && (
          <div id="csv-options" className="space-y-4 rounded-lg border p-4">
            <ImportSelect
              label="Date format"
              showLabel
              value={dateFormat}
              options={dateOptions}
              disabled={!!busy}
              onChange={(value) => {
                if (value) {
                  setDateFormat(value as DateFormat);
                  invalidatePreview();
                }
              }}
            />
            {preview && mapping && (
              <div className="grid gap-3 md:grid-cols-3">
                {(Object.keys(fieldLabels) as MappingField[]).map((field) => (
                  <ImportSelect
                    key={field}
                    label={fieldLabels[field]}
                    showLabel
                    value={mapping[field]}
                    emptyLabel="Not in file"
                    options={preview.columns.map((column) => ({
                      value: column,
                      label: column,
                    }))}
                    disabled={!!busy}
                    onChange={(value) => {
                      setMapping({ ...mapping, [field]: value });
                      setOverrides({});
                      invalidatePreview();
                    }}
                  />
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="link"
              isDisabled={!!busy}
              onPress={downloadTemplate}
            >
              Download sample CSV
            </Button>
          </div>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <output className="block rounded-lg bg-muted p-3 text-sm">
          {message}
        </output>
      )}
      {preview && (
        <div className="space-y-4">
          {stale && (
            <p role="alert" className="text-sm">
              Preview again to apply the changes.
            </p>
          )}
          {preview.errors.map((detail) => (
            <p key={detail} role="alert" className="text-sm text-destructive">
              {detail}
            </p>
          ))}
          {preview.rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="mr-auto font-medium">Review transactions</h3>
                <Badge variant="secondary">
                  {
                    bulk ? preview.expense_rows : preview.rows.filter(
                      (row) => canSelect(row) && row.type === "expense",
                    ).length
                  }{" "}
                  expenses
                </Badge>
                <Badge variant="outline">
                  {
                    bulk ? preview.income_rows : preview.rows.filter(
                      (row) => canSelect(row) && row.type === "income",
                    ).length
                  }{" "}
                  income
                </Badge>
                {preview.duplicate_rows > 0 && (
                  <Badge variant="outline">
                    {preview.duplicate_rows} duplicates skipped
                  </Badge>
                )}
                {preview.total_rows > preview.valid_rows && (
                  <Badge variant="destructive">
                    {preview.total_rows - preview.valid_rows} invalid rows
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Saved{" "}
                <a href="/settings#rules" className="underline">
                  rules
                </a>{" "}
                recognize descriptions such as rent. {bulk
                  ? "The full file has been checked. The table shows the first 1,000 rows; importing includes the entire file."
                  : "Change any type or category below before importing."}
              </p>
              {bulk && (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm">
                    {preview.total_rows.toLocaleString()} rows checked. Use file columns, saved rules, or a fallback category
                    to classify all rows. Fix invalid rows in the CSV and preview again. Large files import as one batch;
                    row-by-row editing is available for files with up to 1,000 rows.
                  </p>
                  {preview.first_issue && <p role="alert" className="text-sm text-destructive">{preview.first_issue}</p>}
                  <ImportSelect label="Fallback category for uncategorized rows" showLabel
                    value={defaultCategory} options={categoryOptions} emptyLabel="Choose a fallback category"
                    disabled={!!busy || categories.loading || !!categories.error}
                    onChange={(value) => { setDefaultCategory(value); invalidatePreview(); }} />
                  <p className="text-xs text-muted-foreground">
                    {preview.missing_categories.toLocaleString()} rows need a category. Existing column and rule categories are preserved.
                  </p>
                </div>
              )}
              {(preview.needs_direction || expenseSign) && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm">
                    Some descriptions have no matching rule or bank type. In
                    this file, expenses are:
                  </p>
                  <ImportSelect
                    label="Expense amounts in this file"
                    value={expenseSign}
                    options={signOptions}
                    emptyLabel="Choose, or set each row below"
                    disabled={blocked}
                    onChange={(value) => {
                      const sign = value as ExpenseSign;
                      setExpenseSign(sign);
                      void loadPreview({ sign, preserve: true });
                    }}
                  />
                </div>
              )}
              {categories.error && (
                <p role="alert" className="text-sm text-destructive">
                  {categories.error}
                  <Button
                    type="button"
                    variant="link"
                    onPress={categories.refresh}
                  >
                    Retry
                  </Button>
                </p>
              )}
              {!categories.loading &&
                !categories.error &&
                !categories.data.length && (
                  <p className="text-sm">
                    <a href="/settings#categories" className="underline">
                      Create categories
                    </a>{" "}
                    before importing.
                  </p>
                )}
              {!bulk && missingCategories > 0 && (
                <ImportSelect
                  label={`Category for ${missingCategories} uncategorized selected rows`}
                  showLabel
                  value={null}
                  options={categoryOptions}
                  placeholder="Apply a category…"
                  disabled={blocked || categories.loading || !!categories.error}
                  onChange={(value) => {
                    if (value) assignCategory(value);
                  }}
                />
              )}
              <div className="rounded-lg border">
                <Table aria-label="CSV transaction preview">
                  <TableHeader>
                  <TableHead id="select">
                    {/* Selection spans all pages, independently of the table's selection slot. */}
                    <Checkbox
                      slot={null}
                      aria-label="Select all valid rows on all pages"
                        isSelected={allSelected}
                        isIndeterminate={
                          !allSelected && selectedRows.length > 0
                        }
                        isDisabled={bulk || blocked || !selectableRows.length}
                        onChange={(checked) =>
                          setSelected(
                            new Set(
                              checked
                                ? selectableRows.map((row) => row.row_number)
                                : [],
                            ),
                          )
                        }
                      />
                    </TableHead>
                    <TableHead id="date">Date</TableHead>
                    <TableHead id="description" isRowHeader>
                      Description
                    </TableHead>
                    <TableHead id="amount">Amount</TableHead>
                    <TableHead id="type">Type</TableHead>
                    <TableHead id="category">Category</TableHead>
                  </TableHeader>
                  <TableBody>
                    {preview.rows
                      .slice(page * pageSize, (page + 1) * pageSize)
                      .map((row) => (
                        <TableRow key={row.row_number} id={row.row_number}>
                          <TableCell>
                        <Checkbox
                          slot={null}
                          aria-label={`Import row ${row.row_number}`}
                              isSelected={selected.has(row.row_number)}
                              isDisabled={bulk || blocked || !canSelect(row)}
                              onChange={(checked) =>
                                setSelected((current) => {
                                  const next = new Set(current);
                                  if (checked) next.add(row.row_number);
                                  else next.delete(row.row_number);
                                  return next;
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>{row.date ?? "—"}</TableCell>
                          <TableCell className="min-w-40 max-w-64 whitespace-normal break-words">
                            {row.merchant || `Row ${row.row_number}`}
                            <span
                              className={`block text-xs ${row.errors.length ? "text-destructive" : "text-muted-foreground"}`}
                            >
                              {row.errors.join(" ") ||
                                (row.duplicate
                                  ? "Duplicate — skipped"
                                  : row.matched_rule
                                    ? `Rule: ${row.matched_rule}`
                                    : row.source_type
                                      ? `Bank: ${row.source_type}`
                                      : "")}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {row.amount ?? "—"}
                          </TableCell>
                          <TableCell>
                            <ImportSelect
                              label={`Type for row ${row.row_number}`}
                              value={row.type}
                              options={transactionTypes}
                              placeholder="Choose type"
                              disabled={bulk || blocked || !!row.errors.length}
                              onChange={(value) => {
                                if (value) {
                                  const types = {
                                    ...overrides,
                                    [row.row_number]: value as TransactionType,
                                  };
                                  setOverrides(types);
                                  void loadPreview({ types, preserve: true });
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <ImportSelect
                              label={`Category for row ${row.row_number}`}
                              value={
                                categories.data.some(
                                  (item) => item.name === row.category,
                                )
                                  ? row.category
                                  : null
                              }
                              options={categoryOptions}
                              placeholder="Choose category"
                              disabled={
                                bulk ||
                                blocked ||
                                !canSelect(row) ||
                                categories.loading ||
                                !!categories.error
                              }
                              onChange={(value) =>
                                assignCategory(value, row.row_number)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {preview.rows.length > pageSize && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isDisabled={blocked || page === 0}
                        onPress={() => setPage((value) => value - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-xs">
                        {page + 1} / {Math.ceil(preview.rows.length / pageSize)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        isDisabled={
                          blocked ||
                          (page + 1) * pageSize >= preview.rows.length
                        }
                        onPress={() => setPage((value) => value + 1)}
                      >
                        Next
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  isDisabled={
                    bulk ? bulkBlocked : blocked ||
                    !!preview.errors.length ||
                    !selectedRows.length ||
                    !!missingTypes ||
                    !!missingCategories ||
                    categories.loading ||
                    !!categories.error
                  }
                  onPress={() => void importSelected()}
                >
                  {busy === "import"
                    ? "Importing…"
                    : bulk ? `Import entire file (${(preview.total_rows - preview.duplicate_rows).toLocaleString()} new)`
                      : `Import ${selectedRows.length} transactions`}
                </Button>
              </div>
              {busy && bulk && <p role="status" className="text-sm text-muted-foreground">Processing the entire file. Large imports may take a few minutes; keep this tab open.</p>}
              {!bulk && (missingTypes > 0 || missingCategories > 0) && (
                <p className="text-xs text-muted-foreground">
                  {missingTypes > 0 &&
                    `${missingTypes} selected rows need a type. `}
                  {missingCategories > 0 &&
                    `${missingCategories} need a category.`}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
