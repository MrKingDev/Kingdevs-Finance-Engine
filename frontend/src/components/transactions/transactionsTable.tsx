"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

import transactionData from "@/data/transactionData.json";

const TransactionsTable = () => {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="w-full min-w-0">
      {/* Table Top Bar */}
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {transactionData.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">
            {transactionData.length}
          </span>{" "}
          transactions
        </p>

        <Button variant="default" size="sm" className="w-full sm:w-auto">
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
            {transactionData.map((transaction) => (
              <TableRow key={transaction.id} id={transaction.id}>
                {/* Date */}
                <TableCell className="whitespace-nowrap">
                  {transaction.date}
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
                  {transaction.bank}
                </TableCell>

                {/* Type */}
                <TableCell className="hidden sm:table-cell">
                  {transaction.type}
                </TableCell>

                {/* Amount */}
                <TableCell
                  className={`whitespace-nowrap text-right font-medium ${
                    transaction.type === "Income"
                      ? "text-green-600 dark:text-green-400"
                      : ""
                  }`}
                >
                  {transaction.type === "Income" ? "+" : "-"}
                  {currencyFormatter.format(transaction.amount)}
                </TableCell>

                {/* Actions */}
                <TableCell className="w-14">
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label={`Delete ${transaction.merchant} transaction`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
