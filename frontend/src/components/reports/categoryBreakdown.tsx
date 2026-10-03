"use client";

import { useEffect, useMemo, useState } from "react";

import { Separator } from "@/components/ui/separator";

type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  bank: string;
  type: "income" | "expense";
  amount: number;
};

const CategoryBreakdown = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data: Transaction[] = await response.json();

        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const categories = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((transaction) => {
      // Ignore income
      if (transaction.type === "income") {
        return;
      }

      const key = transaction.category;

      categoryTotals[key] =
        (categoryTotals[key] ?? 0) + Number(transaction.amount);
    });

    return Object.entries(categoryTotals).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [transactions]);

  if (loading) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Loading categories...
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No spending data available.
      </p>
    );
  }

  return (
    <>
      {categories.map(([category, total], index) => (
        <div key={category}>
          <div className="flex items-center justify-between py-4">
            <p className="font-semibold">{category}</p>

            <p className="shrink-0 font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(total)}
            </p>
          </div>

          {index !== categories.length - 1 && <Separator />}
        </div>
      ))}
    </>
  );
};

export default CategoryBreakdown;
