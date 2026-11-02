"use client";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";

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
  const { formatCurrency, formatCompactCurrency, locale } = useRegionalFormat();
  const { data: chartData, loading, error } = useIncomeExpenseChart(year);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }

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
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 0,
          left: 0,
          bottom: 0,
        }}
      >
        <defs>
          {/* Income gradient */}
          <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-income)"
              stopOpacity={0.5}
            />

            <stop
              offset="95%"
              stopColor="var(--color-income)"
              stopOpacity={0.05}
            />
          </linearGradient>

          {/* Expenses gradient */}
          <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-expenses)"
              stopOpacity={0.5}
            />

            <stop
              offset="95%"
              stopColor="var(--color-expenses)"
              stopOpacity={0.05}
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
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
          tickFormatter={(value) =>
            formatCompactCurrency(Number(value))
          }
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="capitalize">
                    {incomeExpenseChartConfig[
                      name as keyof typeof incomeExpenseChartConfig
                    ]?.label ?? name}
                  </span>

                  <span className="font-mono font-medium">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />

        <Area
          dataKey="income"
          type="monotone"
          baseValue={0}
          fill="url(#fillIncome)"
          stroke="var(--color-income)"
          strokeWidth={2}
          fillOpacity={1}
        />

        <Area
          dataKey="expenses"
          type="monotone"
          baseValue={0}
          fill="url(#fillExpenses)"
          stroke="var(--color-expenses)"
          strokeWidth={2}
          fillOpacity={1}
        />

        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
};

export default AreaChartDisplay;
