"use client";

import * as React from "react";

import PageTransition from "@/components/pageTransitions";

import { Button } from "@/components/ui/button";

import {
  Plus,
  CircleDollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
} from "lucide-react";

import Metric from "@/components/dashboard/metric";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Label as RechartsLabel,
  Pie,
  PieChart,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const incomeExpenseChartData = [
  { date: "2026-01-01", income: 1000, expenses: 800 },
  { date: "2026-02-01", income: 2000, expenses: 900 },
  { date: "2026-03-01", income: 5000, expenses: 1100 },
  { date: "2026-04-01", income: 1350, expenses: 950 },
  { date: "2026-05-01", income: 2750, expenses: 1200 },
  { date: "2026-06-01", income: 1400, expenses: 1050 },
  { date: "2026-07-01", income: 1900, expenses: 1300 },
  { date: "2026-08-01", income: 1650, expenses: 1150 },
  { date: "2026-09-01", income: 2100, expenses: 1450 },
];

const incomeExpenseChartConfig = {
  income: {
    label: "Income",
    color: "var(--chart-green-1)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-red-2)",
  },
} satisfies ChartConfig;

const Dashboard = () => {
  const today = new Date();

  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const totalSpending = React.useMemo(() => {
    return spendingChartData.reduce((total, item) => total + item.amount, 0);
  }, []);

  const [chartType, setChartType] = React.useState<"area" | "bar">("area");

  return (
    <PageTransition>
      <main className="flex flex-col gap-4">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>

            <p className="text-muted-foreground">
              A clear picture of your money for {currentMonth}/{currentYear}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month */}
            <Select
              placeholder="Month"
              aria-label="Month"
              defaultValue={currentMonth}
            >
              <SelectTrigger
                aria-label="Month"
                className="w-full min-w-0 sm:w-45"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (month) => (
                      <SelectItem key={month} value={month}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "long",
                        }).format(new Date(2000, month - 1))}
                      </SelectItem>
                    ),
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Year */}
            <Select
              placeholder="Year"
              aria-label="Year"
              defaultValue={currentYear}
            >
              <SelectTrigger
                aria-label="Year"
                className="w-full min-w-0 sm:w-45"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 101 }, (_, index) => 2000 + index).map(
                    (year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ),
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button aria-label="Add Transaction">
              <Plus />
              Add Transaction
            </Button>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Balance through month"
            value="N/A"
            icon={<CircleDollarSign size={19} />}
            bg="bg-metric-1-bg"
            text="text-metric-1-text"
          />

          <Metric
            label="Income"
            value="N/A"
            icon={<ArrowDownLeft size={19} />}
            bg="bg-metric-2-bg"
            text="text-metric-2-text"
          />

          <Metric
            label="Expenses"
            value="N/A"
            icon={<ArrowUpRight size={19} />}
            bg="bg-metric-3-bg"
            text="text-metric-3-text"
          />

          <Metric
            label="Savings"
            value="N/A"
            icon={<PiggyBank size={19} />}
            bg="bg-metric-4-bg"
            text="text-metric-4-text"
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Spending by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>

            <CardContent>
              <ChartContainer
                config={spendingChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
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
            </CardContent>
          </Card>

          {/* Income vs Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Income vs Expenses</CardTitle>
              <CardDescription>
                <RadioGroup
                  value={chartType}
                  onChange={(value) => {
                    if (value === "area" || value === "bar") {
                      setChartType(value);
                    }
                  }}
                  orientation="horizontal"
                  aria-label="Chart type"
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="area" id="chart-area" />

                    <Label htmlFor="chart-area" className="cursor-pointer">
                      Area
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="bar" id="chart-bar" />

                    <Label htmlFor="chart-bar" className="cursor-pointer">
                      Bar
                    </Label>
                  </div>
                </RadioGroup>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ChartContainer
                config={incomeExpenseChartConfig}
                className="aspect-auto h-62.5 w-full"
              >
                {chartType === "area" ? (
                  <AreaChart data={incomeExpenseChartData}>
                    <defs>
                      <linearGradient
                        id="fillIncome"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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

                      <linearGradient
                        id="fillExpenses"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                ) : (
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
                )}
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
      </main>
    </PageTransition>
  );
};

export default Dashboard;
