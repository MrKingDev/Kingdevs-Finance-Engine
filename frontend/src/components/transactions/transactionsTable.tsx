import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

// Types

interface Transaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  bank: string;
  type: "income" | "expense";
  amount: number;
}

interface TransactionsTableProps {
  search: string;
  type: string;
  category: string;
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
  // State FIRST
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data: Transaction[] = await response.json();

        setTransactions(data);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while fetching transactions.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter AFTER transactions has been declared
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.merchant.toLowerCase().includes(search.toLowerCase()) ||
      transaction.category.toLowerCase().includes(search.toLowerCase()) ||
      transaction.bank.toLowerCase().includes(search.toLowerCase());

    const matchesType = type === "all" || transaction.type === type;

    const matchesCategory =
      category === "all" || transaction.category === category;

    const matchesBank = bank === "all" || transaction.bank === bank;

    const matchesStartDate = startDate === "" || transaction.date >= startDate;

    const matchesEndDate = endDate === "" || transaction.date <= endDate;

    const matchesMinAmount =
      minAmount === "" || transaction.amount >= Number(minAmount);

    const matchesMaxAmount =
      maxAmount === "" || transaction.amount <= Number(maxAmount);

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

  // Fetching data from API

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data: Transaction[] = await response.json();

        setTransactions(data);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while fetching transactions.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Deleting Transaction

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      setTransactions((currentTransactions) =>
        currentTransactions.filter((transaction) => transaction.id !== id),
      );
    } catch (error) {
      console.error("Delete transaction error:", error);
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
              <TableRow key={transaction.id} id={transaction.id}>
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
                  {currencyFormatter.format(transaction.amount)}
                </TableCell>

                {/* Actions */}

                <TableCell className="w-14">
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="icon"
                      aria-label={`Delete ${transaction.merchant} transaction`}
                      onClick={() => handleDeleteTransaction(transaction.id)}
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
