"use client";

import { Separator } from "@/components/ui/separator";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Transaction } from "@/types/api";

export default function RecentTransactions() {
  const {
    data: transactions,
    loading,
    error,
  } = useFinanceList<Transaction>("/transactions");
  if (loading)
    return (
      <p className="text-sm text-muted-foreground">Loading transactions...</p>
    );
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (!transactions.length)
    return (
      <p className="text-sm text-muted-foreground">No transactions yet.</p>
    );

  return (
    <>
      {transactions.slice(0, 5).map((transaction, index) => (
        <div key={transaction.id}>
          <div className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{transaction.merchant}</p>
              <p className="text-muted-foreground">
                {transaction.category} · {transaction.bank} · {transaction.date}
              </p>
            </div>
            <p
              className={`shrink-0 font-semibold ${transaction.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
            >
              {transaction.type === "income" ? "+" : "-"}$
              {Number(transaction.amount).toFixed(2)}
            </p>
          </div>
          {index < Math.min(transactions.length, 5) - 1 && <Separator />}
        </div>
      ))}
    </>
  );
}
