import * as React from "react";
import { Label as RechartsLabel, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Data & Config
import spendingChartData from "@/data/spendingChartData.json";

const spendingChartConfig = {
  amount: {
    label: "Amount",
  },

  food: {
    label: "Food",
    color: "var(--chart-orange-2)",
  },

  transportation: {
    label: "Transportation",
    color: "var(--chart-blue-2)",
  },

  shopping: {
    label: "Shopping",
    color: "var(--chart-pink-2)",
  },

  entertainment: {
    label: "Entertainment",
    color: "var(--chart-purple-2)",
  },

  housing: {
    label: "Housing",
    color: "var(--chart-emerald-2)",
  },

  utilities: {
    label: "Utilities",
    color: "var(--chart-yellow-2)",
  },

  subscriptions: {
    label: "Subscriptions",
    color: "var(--chart-violet-2)",
  },

  health: {
    label: "Health",
    color: "var(--chart-red-2)",
  },

  education: {
    label: "Education",
    color: "var(--chart-cyan-2)",
  },

  travel: {
    label: "Travel",
    color: "var(--chart-teal-2)",
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
              formatter={(value, name, item) => (
                <div className="flex w-full items-center gap-2">
                  {/* Color Indicator */}
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{
                      backgroundColor: item.payload?.fill,
                    }}
                  />

                  {/* Label + Value */}
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
