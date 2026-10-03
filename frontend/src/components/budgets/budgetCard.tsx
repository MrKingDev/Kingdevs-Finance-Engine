"use client";

import { Trash } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Budget } from "@/types/api";

type BudgetCardProps = {
  budget: Budget;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const BudgetCard = ({
  budget,
  onDelete,
  isDeleting = false,
}: BudgetCardProps) => {
  const monthName = monthNames[budget.month - 1] ?? "Unknown";

  const spent = Number(budget.spent);
  const remaining = Number(budget.remaining);
  const usagePercentage = budget.usage_percentage;

  /*
   * Progress bars normally stop at 100,
   * even if the user goes over budget.
   */
  const progressValue = Math.min(Math.max(usagePercentage, 0), 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <span>{monthName}</span>

            <span>{budget.year}</span>
          </div>

          <span className="text-lg font-semibold">
            {budget.category ?? "All categories"}
          </span>
        </CardTitle>

        <CardAction>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Delete budget"
            isDisabled={isDeleting}
            onPress={() => onDelete(budget.id)}
          >
            <Trash className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Budget Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Budget</p>

            <p className="font-semibold">
              {currencyFormatter.format(Number(budget.budget))}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Spent</p>

            <p className="font-semibold">{currencyFormatter.format(spent)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Remaining</p>

            <p className="font-semibold">
              {currencyFormatter.format(remaining)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Budget usage</p>

            <p className="font-medium">{usagePercentage.toFixed(1)}% used</p>
          </div>

          <Progress
            aria-label="Budget progress"
            value={progressValue}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetCard;
