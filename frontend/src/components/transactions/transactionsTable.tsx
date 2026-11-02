"use client";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";

import { Pencil, Trash2 } from "lucide-react";

import { useEffect, useState } from "react";
import BankBadge from "@/components/banks/bankBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import type { Transaction } from "@/types/api";

// Types

interface TransactionsTableProps {
  search: string;
  type: string;
  category: string | null;
  bank: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  onClearFilters: () => void;
  onEdit: (transaction: Transaction) => void;
}

// Transaction Component

const TransactionsTable = ({
  search,
  type,
  category,
  bank,
  startDate,
  endDate,
  minAmount,
  maxAmount,
  onClearFilters,
  onEdit,
}: TransactionsTableProps) => {
  const { currencyFormatter, formatDate } = useRegionalFormat();
  // State

  const filters = new URLSearchParams();
  if (search) filters.set("search", search);
  if (type !== "all") filters.set("type", type);
  if (category !== null) filters.set("category", category);
  if (bank !== "all") filters.set("bank", bank);
  if (startDate) filters.set("start_date", startDate);
  if (endDate) filters.set("end_date", endDate);
  if (minAmount) filters.set("min_amount", minAmount);
  if (maxAmount) filters.set("max_amount", maxAmount);
  const filterKey = filters.toString();
  const [position, setPosition] = useState({ filterKey: "", page: 1 });
  const page = position.filterKey === filterKey ? position.page : 1;
  const [result, setResult] = useState<{
    items: Transaction[];
    total: number;
    overall_total: number;
    page: number;
    pages: number;
  }>({ items: [], total: 0, overall_total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("finance-data-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("finance-data-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision refreshes rows after saves, deletes, or window focus.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const response = await fetch(
          `${API_URL}/transactions/page?page=${page}&${filterKey}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok)
          throw new Error(
            await apiError(response, "Unable to load transactions."),
          );
        const data = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load transactions.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filterKey, page, revision]);
  const transactions = result.items;
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Currency formatter

  // Delete transaction

  const handleDeleteTransaction = async (id: number) => {
    try {
      setDeletingId(id);
      setActionError(null);

      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error("Delete failed:", {
          id,
          url: `${API_URL}/transactions/${id}`,
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        throw new Error(
          `Failed to delete transaction: ${response.status} ${response.statusText}`,
        );
      }

      // Reload the transaction list and any mounted budget views.

      notifyFinanceChanged();
    } catch (error) {
      console.error("Delete transaction error:", error);
      setActionError("Unable to delete transaction. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Loading Page

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading transactions...</p>
      </div>
    );
  }

  // Error Page

  if (error) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}
      {/* Table Top Bar */}

      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {result.total ? (result.page - 1) * 50 + 1 : 0}–
          {Math.min(result.page * 50, result.total)} of{" "}
          {result.total.toLocaleString()} matching transactions
          {result.total !== result.overall_total &&
            ` (${result.overall_total.toLocaleString()} total)`}
        </p>

        <Button
          variant="default"
          size="sm"
          className="w-full sm:w-auto"
          onClick={onClearFilters}
        >
          Clear Filters
        </Button>
      </div>

      {/* Table */}

      <div className="w-full overflow-x-auto rounded-md border">
        <Table aria-label="Transactions" className="min-w-150">
          <TableHeader>
            <TableHead id="date" isRowHeader className="whitespace-nowrap">
              Date
            </TableHead>

            <TableHead id="merchant">Merchant</TableHead>

            {/* Tablet + */}

            <TableHead id="category" className="hidden md:table-cell">
              Category
            </TableHead>

            {/* Desktop + */}

            <TableHead id="bank" className="hidden lg:table-cell">
              Bank
            </TableHead>

            <TableHead id="type" className="hidden sm:table-cell">
              Type
            </TableHead>

            <TableHead id="amount" className="whitespace-nowrap text-right">
              Amount
            </TableHead>

            <TableHead id="actions" className="w-28">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableHeader>

          <TableBody renderEmptyState={() => "No transactions found."}>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} id={String(transaction.id)}>
                {/* Date */}

                <TableCell className="whitespace-nowrap">
                  {formatDate(transaction.date)}
                </TableCell>

                {/* Merchant */}

                <TableCell className="max-w-35 font-medium sm:max-w-50">
                  <div className="truncate">{transaction.merchant}</div>
                </TableCell>

                {/* Category */}

                <TableCell className="hidden md:table-cell">
                  {transaction.category}
                </TableCell>

                {/* Bank */}

                <TableCell className="hidden lg:table-cell">
                  <BankBadge bank={transaction.bank} />
                </TableCell>

                {/* Type */}

                <TableCell className="hidden capitalize sm:table-cell">
                  {transaction.type}
                </TableCell>

                {/* Amount */}

                <TableCell
                  className={`whitespace-nowrap text-right font-medium ${
                    transaction.type === "income"
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}

                  {currencyFormatter.format(Number(transaction.amount))}
                </TableCell>

                {/* Actions */}

                <TableCell className="w-28">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${transaction.merchant} transaction`}
                      onPress={() => onEdit(transaction)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <AlertDialogTrigger>
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label={`Delete ${transaction.merchant} transaction`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete this transaction.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Never Mind</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            isDisabled={deletingId === transaction.id}
                            onClick={() => {
                              handleDeleteTransaction(transaction.id);
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialog>
                    </AlertDialogTrigger>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <nav
        aria-label="Transaction pages"
        className="flex flex-wrap items-center justify-between gap-3 py-4"
      >
        <output className="text-sm text-muted-foreground">
          Page {result.page.toLocaleString()} of {result.pages.toLocaleString()}{" "}
          · 50 per page
        </output>
        <div className="flex gap-2">
          <Button
            variant="outline"
            isDisabled={result.page <= 1 || loading}
            onPress={() => setPosition({ filterKey, page: result.page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            isDisabled={result.page >= result.pages || loading}
            onPress={() => setPosition({ filterKey, page: result.page + 1 })}
          >
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default TransactionsTable;
