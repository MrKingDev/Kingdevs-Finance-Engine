"use client";

import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Budget } from "@/types/api";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function BudgetCategoryChart({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const {
    data: budgets,
    loading,
    error,
  } = useFinanceList<Budget>(`/budgets?month=${month}&year=${year}`);
  if (loading)
    return <p className="text-sm text-muted-foreground">Loading budgets...</p>;
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (!budgets.length)
    return (
      <p className="text-sm text-muted-foreground">
        No budgets for this month. Create one on the Budgets page.
      </p>
    );

  return (
    <div className="space-y-6">
      {budgets.map((budget) => {
        const remaining = Number(budget.remaining);
        const label = budget.category ?? "All categories";
        return (
          <div key={budget.id} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{label}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {currency.format(Number(budget.spent))} /{" "}
                  {currency.format(Number(budget.budget))}
                </p>
                {remaining < 0 && (
                  <AlertTriangle
                    className="size-4 text-destructive"
                    aria-label="Over budget"
                  />
                )}
              </div>
            </div>
            <Progress
              value={Math.min(Math.max(budget.usage_percentage, 0), 100)}
              aria-label={`${label} budget usage`}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{budget.usage_percentage.toFixed(1)}% used</span>
              {remaining < 0 && (
                <span className="font-medium text-destructive">
                  {currency.format(-remaining)} over budget
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
