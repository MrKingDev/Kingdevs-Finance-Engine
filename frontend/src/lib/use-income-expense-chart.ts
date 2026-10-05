"use client";

import { useMemo } from "react";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Transaction } from "@/types/api";

export function useIncomeExpenseChart(year: number) {
  const { data: transactions, loading, error } = useFinanceList<Transaction>("/transactions");
  const data = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      date: `${year}-${String(index + 1).padStart(2, "0")}-01`, income: 0, expenses: 0,
    }));
    for (const transaction of transactions) {
      const [transactionYear, month] = transaction.date.split("-").map(Number);
      if (transactionYear !== year || month < 1 || month > 12) continue;
      const key = transaction.type === "income" ? "income" : "expenses";
      months[month - 1][key] += Number(transaction.amount);
    }
    return months;
  }, [transactions, year]);
  return { data, loading, error };
}
