"use client";

import { useIncomeExpenseChart } from "@/lib/use-income-expense-chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

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

const AreaChartDisplay = ({ year }: { year: number }) => {
  const { data: chartData, loading, error } = useIncomeExpenseChart(year);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;

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
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-income)"
              stopOpacity={0.8}
            />

            <stop
              offset="95%"
              stopColor="var(--color-income)"
              stopOpacity={0.1}
            />
          </linearGradient>

          <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-expenses)"
              stopOpacity={0.8}
            />

            <stop
              offset="95%"
              stopColor="var(--color-expenses)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>

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
              indicator="dot"
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

        <Area
          dataKey="income"
          type="natural"
          fill="url(#fillIncome)"
          stroke="var(--color-income)"
          fillOpacity={0.4}
        />

        <Area
          dataKey="expenses"
          type="natural"
          fill="url(#fillExpenses)"
          stroke="var(--color-expenses)"
          fillOpacity={0.4}
        />

        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
};

export default AreaChartDisplay;
