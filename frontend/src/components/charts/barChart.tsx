import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Chart data & Config
const incomeExpenseChartData = [
  { date: "2026-01-01", income: 2350, expenses: 1825 },
  { date: "2026-02-01", income: 2480, expenses: 1940 },
  { date: "2026-03-01", income: 2750, expenses: 2105 },
  { date: "2026-04-01", income: 2600, expenses: 1875 },
  { date: "2026-05-01", income: 3100, expenses: 2250 },
  { date: "2026-06-01", income: 2850, expenses: 2325 },
  { date: "2026-07-01", income: 3400, expenses: 2475 },
  { date: "2026-08-01", income: 3200, expenses: 2380 },
  { date: "2026-09-01", income: 3650, expenses: 2590 },
  { date: "2026-10-01", income: 3450, expenses: 2710 },
  { date: "2026-11-01", income: 3900, expenses: 2865 },
  { date: "2026-12-01", income: 4200, expenses: 3150 },
];

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
  return (
    <ChartContainer
      config={incomeExpenseChartConfig}
      className="aspect-auto h-62.5 w-full"
    >
      <BarChart data={incomeExpenseChartData} accessibilityLayer>
        <CartesianGrid vertical={false} />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-US", {
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
                new Date(value).toLocaleDateString("en-US", {
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
