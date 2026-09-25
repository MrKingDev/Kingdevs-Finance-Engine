"use client";

import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const budgetData = [
  {
    category: "Food",
    spent: 320,
    budget: 400,
  },
  {
    category: "Shopping",
    spent: 180,
    budget: 200,
  },
  {
    category: "Transport",
    spent: 110,
    budget: 250,
  },
  {
    category: "Entertainment",
    spent: 240,
    budget: 150,
  },
];

export default function BudgetCategoryChart() {
  return (
    <div className="space-y-6">
      {budgetData.map((item) => {
        const percentage = (item.spent / item.budget) * 100;
        const isOverBudget = item.spent > item.budget;

        return (
          <div key={item.category} className="space-y-2">
            {/* Top row */}
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{item.category}</p>

              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  ${item.spent.toFixed(0)} / ${item.budget.toFixed(0)}
                </p>

                {isOverBudget && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <Progress
              value={Math.min(percentage, 100)}
              aria-label={`${item.category} budget usage`}
              className="h-2"
            />

            {/* Percentage */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percentage.toFixed(0)}% used</span>

              {isOverBudget && (
                <span className="font-medium text-destructive">
                  ${(item.spent - item.budget).toFixed(0)} over budget
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
