import * as React from "react";
import { Label as RechartsLabel, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Data & Config
const spendingChartData = [
  {
    category: "food",
    amount: 245.5,
    fill: "var(--color-food)",
  },
  {
    category: "transportation",
    amount: 120,
    fill: "var(--color-transportation)",
  },
  {
    category: "shopping",
    amount: 85.75,
    fill: "var(--color-shopping)",
  },
  {
    category: "entertainment",
    amount: 60,
    fill: "var(--color-entertainment)",
  },
];

const spendingChartConfig = {
  amount: {
    label: "Amount",
  },

  food: {
    label: "Food",
    color: "var(--chart-green-1)",
  },

  transportation: {
    label: "Transportation",
    color: "var(--chart-green-2)",
  },

  shopping: {
    label: "Shopping",
    color: "var(--chart-green-3)",
  },

  entertainment: {
    label: "Entertainment",
    color: "var(--chart-green-4)",
  },
} satisfies ChartConfig;

const PieChartDisplay = () => {
  const totalSpending = React.useMemo(() => {
    return spendingChartData.reduce((total, item) => total + item.amount, 0);
  }, []);

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
