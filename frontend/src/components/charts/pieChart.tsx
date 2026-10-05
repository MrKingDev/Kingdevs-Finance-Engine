"use client";

import * as React from "react";
import { Label as RechartsLabel, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { useFinanceList } from "@/lib/use-finance-list";
import type { Transaction } from "@/types/api";

type SpendingChartData = {
  category: string;
  amount: number;
  fill: string;
};

type PieChartDisplayProps = {
  month: number;
  year: number;
};

const spendingChartConfig = {
  amount: {
    label: "Amount",
  },
} satisfies ChartConfig;

const PieChartDisplay = ({ month, year }: PieChartDisplayProps) => {
  const {
    data: transactions,
    loading,
    error,
  } = useFinanceList<Transaction>("/transactions");
  const spendingChartData = React.useMemo<SpendingChartData[]>(() => {
    const totals = new Map<string, SpendingChartData>();
    for (const transaction of transactions) {
      const [transactionYear, transactionMonth] = transaction.date
        .split("-")
        .map(Number);
      if (
        transaction.type !== "expense" ||
        transactionYear !== year ||
        transactionMonth !== month
      )
        continue;
      const entry = totals.get(transaction.category) ?? {
        category: transaction.category,
        amount: 0,
        fill: transaction["pie-color"],
      };
      entry.amount += Number(transaction.amount);
      totals.set(transaction.category, entry);
    }
    return [...totals.values()];
  }, [transactions, month, year]);

  const totalSpending = React.useMemo(() => {
    return spendingChartData.reduce((total, item) => total + item.amount, 0);
  }, [spendingChartData]);

  if (loading) {
    return (
      <div className="flex h-62.5 w-full items-center justify-center">
        Loading chart...
      </div>
    );
  }

  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (!spendingChartData.length)
    return (
      <p className="text-sm text-muted-foreground">
        No expenses for this month.
      </p>
    );

  return (
    <ChartContainer
      config={spendingChartConfig}
      className="mx-auto aspect-square max-h-62.5"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name, item) => (
                <div className="flex w-full items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{
                      backgroundColor: item.payload?.fill,
                    }}
                  />

                  <div className="flex flex-1 items-center justify-between gap-4">
                    <span className="capitalize">{name}</span>

                    <span className="font-mono font-medium tabular-nums">
                      $
                      {Number(value).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            />
          }
        />

        <Pie
          data={spendingChartData}
          dataKey="amount"
          nameKey="category"
          innerRadius={60}
          outerRadius={90}
          strokeWidth={5}
        >
          <RechartsLabel
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-2xl font-bold"
                    >
                      $
                      {totalSpending.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </tspan>

                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 24}
                      className="fill-muted-foreground text-sm"
                    >
                      Total Spending
                    </tspan>
                  </text>
                );
              }

              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
};

export default PieChartDisplay;
