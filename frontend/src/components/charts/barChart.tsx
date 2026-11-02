"use client";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";

import { useIncomeExpenseChart } from "@/lib/use-income-expense-chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

const BarChartDisplay = ({ year }: { year: number }) => {
  const { formatCurrency, formatCompactCurrency, locale } = useRegionalFormat();
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
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) =>
            new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
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
            formatCompactCurrency(Number(value))
          }
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dashed"
              labelFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="capitalize">{name}</span>

                  <span className="font-mono font-medium">
                    {formatCurrency(Number(value))}
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
