"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
};

type ChartData = {
  week: string;
  amount: number;
};

type BarChart2Props = {
  category: string;
  month: number;
  year: number;
};

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--chart-green-2)",
  },
} satisfies ChartConfig;

const BarChart2 = ({ category, month, year }: BarChart2Props) => {
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

  const chartData = useMemo<ChartData[]>(() => {
    const weeklyTotals = [0, 0, 0, 0];

    transactions.forEach((transaction) => {
      // Only expenses
      if (transaction.type !== "expense") {
        return;
      }

      // Selected category
      if (category !== "all" && transaction.category !== category) {
        return;
      }

      const [transactionYear, transactionMonth, transactionDay] =
        transaction.date.split("-").map(Number);

      // Selected month/year
      if (transactionYear !== year || transactionMonth !== month) {
        return;
      }

      let weekIndex: number;

      if (transactionDay <= 7) {
        weekIndex = 0;
      } else if (transactionDay <= 14) {
        weekIndex = 1;
      } else if (transactionDay <= 21) {
        weekIndex = 2;
      } else {
        weekIndex = 3;
      }

      weeklyTotals[weekIndex] += Number(transaction.amount);
    });

    return [
      {
        week: "Week 1",
        amount: weeklyTotals[0],
      },
      {
        week: "Week 2",
        amount: weeklyTotals[1],
      },
      {
        week: "Week 3",
        amount: weeklyTotals[2],
      },
      {
        week: "Week 4",
        amount: weeklyTotals[3],
      },
    ];
  }, [transactions, category, month, year]);

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        Loading chart...
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="week"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(value)
          }
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(Number(value))
              }
            />
          }
        />

        <Bar
          dataKey="amount"
          fill="var(--color-amount)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
};

export default BarChart2;
