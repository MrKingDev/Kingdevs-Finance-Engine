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

type MonthlyTotal = {
  year: number;
  month: number;
  total: number;
};

const MonthlyHistory = () => {
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

  const recentMonths = useMemo(() => {
    const monthlyTotals: Record<string, MonthlyTotal> = {};

    transactions.forEach((transaction) => {
      const [year, month] = transaction.date.split("-").map(Number);

      const key = `${year}-${String(month).padStart(2, "0")}`;

      const amount = Number(transaction.amount);

      const signedAmount = transaction.type === "income" ? amount : -amount;

      if (!monthlyTotals[key]) {
        monthlyTotals[key] = {
          year,
          month,
          total: 0,
        };
      }

      monthlyTotals[key].total += signedAmount;
    });

    return Object.values(monthlyTotals)
      .sort((a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year;
        }

        return b.month - a.month;
      })
      .slice(0, 6)
      .reverse();
  }, [transactions]);

  if (loading) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Loading monthly history...
      </p>
    );
  }

  if (recentMonths.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No transaction history available.
      </p>
    );
  }

  return (
    <>
      {recentMonths.map((month, index) => {
        const label = new Date(
          month.year,
          month.month - 1,
          1,
        ).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        return (
          <div key={`${month.year}-${month.month}`}>
            <div className="flex items-center justify-between py-4">
              <p className="font-semibold">{label}</p>

              <p className="shrink-0 font-semibold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(month.total)}
              </p>
            </div>

            {index !== recentMonths.length - 1 && <Separator />}
          </div>
        );
      })}
    </>
  );
};

export default MonthlyHistory;
