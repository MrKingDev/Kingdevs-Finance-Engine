"use client";

import { useState } from "react";
import { API_URL, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Transaction } from "@/types/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
import { Badge } from "@/components/ui/badge";

import { Trash2 } from "lucide-react";

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
}

// Format YYYY-MM-DD -> MM/DD/YYYY

const formatDate = (date: string) => {
  const [year, month, day] = date.split("-");

  return `${month}/${day}/${year}`;
};

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
}: TransactionsTableProps) => {
  // State

  const {
    data: transactions,
    loading,
    error,
  } = useFinanceList<Transaction>("/transactions");
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Currency formatter

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

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

  // Filter transactions

  const filteredTransactions = transactions.filter((transaction) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      transaction.merchant.toLowerCase().includes(searchValue) ||
      transaction.category.toLowerCase().includes(searchValue) ||
      transaction.bank.toLowerCase().includes(searchValue);

    const matchesType = type === "all" || transaction.type === type;

    const matchesCategory =
      category === null || transaction.category === category;

    const matchesBank = bank === "all" || transaction.bank === bank;

    const matchesStartDate = startDate === "" || transaction.date >= startDate;

    const matchesEndDate = endDate === "" || transaction.date <= endDate;

    const matchesMinAmount =
      minAmount === "" || Number(transaction.amount) >= Number(minAmount);

    const matchesMaxAmount =
      maxAmount === "" || Number(transaction.amount) <= Number(maxAmount);

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesBank &&
      matchesStartDate &&
      matchesEndDate &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });

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
          <span className="font-medium text-foreground">
            {filteredTransactions.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">
            {transactions.length}
          </span>{" "}
          transactions
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
        <Table className="min-w-150">
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

            <TableHead id="actions" className="w-14">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableHeader>

          <TableBody renderEmptyState={() => "No transactions found."}>
            {filteredTransactions.map((transaction) => (
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
                  <Badge variant="secondary">{transaction.bank}</Badge>
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

                <TableCell className="w-14">
                  <div className="flex justify-end">
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
    </div>
  );
};

export default TransactionsTable;
