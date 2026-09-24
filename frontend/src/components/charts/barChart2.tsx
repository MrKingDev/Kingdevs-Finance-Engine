"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartData = [
  { week: "Week 1", amount: 150 },
  { week: "Week 2", amount: 200 },
  { week: "Week 3", amount: 500 },
  { week: "Week 4", amount: 100 },
];

const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--chart-green-2)",
  },
} satisfies ChartConfig;

const BarChart2 = () => {
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
