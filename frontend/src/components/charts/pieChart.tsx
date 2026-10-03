"use client";

import * as React from "react";
import { Label as RechartsLabel, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  bank: string;
  type: "income" | "expense";
  amount: number;
  "pie-color": string;
};

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
  const [spendingChartData, setSpendingChartData] = React.useState<
    SpendingChartData[]
  >([]);

  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const transactions: Transaction[] = await response.json();

        const categoryTotals: Record<
          string,
          {
            amount: number;
            fill: string;
          }
        > = {};

        transactions.forEach((transaction) => {
          // Only expenses
          if (transaction.type !== "expense") {
            return;
          }

          const [transactionYear, transactionMonth] = transaction.date
            .split("-")
            .map(Number);

          // Only transactions for selected month/year
          if (transactionYear !== year || transactionMonth !== month) {
            return;
          }

          const category = transaction.category.trim();

          // Create category if it doesn't exist yet
          if (!categoryTotals[category]) {
            categoryTotals[category] = {
              amount: 0,
              fill: transaction["pie-color"] || "var(--chart-gray-2)",
            };
          }

          // Add transaction amount to category total
          categoryTotals[category].amount += Number(transaction.amount);
        });

        const data: SpendingChartData[] = Object.entries(categoryTotals).map(
          ([category, values]) => ({
            category,
            amount: values.amount,
            fill: values.fill,
          }),
        );

        setSpendingChartData(data);
      } catch (error) {
        console.error("Error fetching spending chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [month, year]);

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
