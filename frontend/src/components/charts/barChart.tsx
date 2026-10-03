"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
};

type ChartData = {
  date: string;
  income: number;
  expenses: number;
};

const incomeExpenseChartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-green-2)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-red-2)",
  },
} satisfies ChartConfig;

const BarChartDisplay = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
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

        const transactions: Transaction[] = await response.json();

        const currentYear = new Date().getFullYear();

        const monthlyData: ChartData[] = Array.from(
          { length: 12 },
          (_, index) => ({
            date: `${currentYear}-${String(index + 1).padStart(2, "0")}-01`,
            income: 0,
            expenses: 0,
          }),
        );

        transactions.forEach((transaction) => {
          const [year, month] = transaction.date.split("-").map(Number);

          if (year !== currentYear) {
            return;
          }

          const monthIndex = month - 1;
          const amount = Number(transaction.amount);

          if (transaction.type === "income") {
            monthlyData[monthIndex].income += amount;
          }

          if (transaction.type === "expense") {
            monthlyData[monthIndex].expenses += amount;
          }
        });

        setChartData(monthlyData);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex h-62.5 w-full items-center justify-center">
        Loading chart...
      </div>
    );
  }

  return (
    <ChartContainer
      config={incomeExpenseChartConfig}
      className="aspect-auto h-62.5 w-full"
    >
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) =>
            new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
            })
          }
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={60}
          domain={[0, "auto"]}
          tickFormatter={(value) =>
            `$${Number(value).toLocaleString("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            })}`
          }
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dashed"
              labelFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="capitalize">{name}</span>

                  <span className="font-mono font-medium">
                    $
                    {Number(value).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
            />
          }
        />

        <Bar
          dataKey="income"
          fill="var(--color-income)"
          radius={[4, 4, 0, 0]}
        />

        <Bar
          dataKey="expenses"
          fill="var(--color-expenses)"
          radius={[4, 4, 0, 0]}
        />

        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
};

export default BarChartDisplay;
