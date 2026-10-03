"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import PageTransition from "@/components/pageTransitions";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Charts
import PieChartDisplay from "@/components/charts/pieChart";
import AreaChartDisplay from "@/components/charts/areaChart";
import BarChartDisplay from "@/components/charts/barChart";
import BarChart2 from "@/components/charts/barChart2";
import BudgetCategoryChart from "@/components/charts/budgetCategoryChart";

import MonthlyHistory from "@/components/reports/monthlyHistory";
import CategoryBreakdown from "@/components/reports/categoryBreakdown";

type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  bank: string;
  type: "income" | "expense";
  amount: number;
};

const Reports = () => {
  const [chartType, setChartType] = React.useState<"area" | "bar">("area");
  const [category, setCategory] = useState("all");

  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch transactions
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

  // Calculate current month totals
  const { monthlyIncome, monthlyExpenses, netCashFlow } = useMemo(() => {
    let income = 0;
    let expenses = 0;

    transactions.forEach((transaction) => {
      const [year, month] = transaction.date.split("-").map(Number);

      if (year !== selectedYear || month !== selectedMonth) {
        return;
      }

      const amount = Number(transaction.amount);

      if (transaction.type === "income") {
        income += amount;
      }

      if (transaction.type === "expense") {
        expenses += amount;
      }
    });

    return {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      netCashFlow: income - expenses,
    };
  }, [transactions, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const selectedMonthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(new Date(selectedYear, selectedMonth - 1));

  return (
    <PageTransition>
      <div className="w-full min-w-0">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Reports</h1>

            <p className="text-muted-foreground">
              Understand where your money comes from and where it goes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month */}
            <Select
              placeholder="Month"
              aria-label="Month"
              selectedKey={String(selectedMonth)}
              onSelectionChange={(key) => {
                setSelectedMonth(Number(key));
              }}
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
                      <SelectItem key={month} id={String(month)}>
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
              selectedKey={String(selectedYear)}
              onSelectionChange={(key) => {
                setSelectedYear(Number(key));
              }}
            >
              <SelectTrigger
                aria-label="Year"
                className="w-full min-w-0 sm:w-45"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 27 }, (_, index) => 2000 + index)
                    .reverse()
                    .map((year) => (
                      <SelectItem key={year} id={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Report Metrics */}
        <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Monthly Income */}
          <Card className="min-w-0">
            <CardHeader>
              <CardDescription>
                Income · {selectedMonthName} {selectedYear}
              </CardDescription>

              <CardTitle className="text-xl">
                {loading ? "Loading..." : formatCurrency(monthlyIncome)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Monthly Expenses */}
          <Card className="min-w-0">
            <CardHeader>
              <CardDescription>
                Expenses · {selectedMonthName} {selectedYear}
              </CardDescription>

              <CardTitle className="text-xl">
                {loading ? "Loading..." : formatCurrency(monthlyExpenses)}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Net Cash Flow */}
          <Card className="min-w-0">
            <CardHeader>
              <CardDescription>
                Net Cash Flow · {selectedMonthName} {selectedYear}
              </CardDescription>

              <CardTitle className="text-xl">
                {loading ? "Loading..." : formatCurrency(netCashFlow)}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        {/* Main Charts */}
        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Spending By Category */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>Spending by category</CardTitle>
            </CardHeader>

            <CardContent className="min-w-0 overflow-hidden">
              <PieChartDisplay month={selectedMonth} year={selectedYear} />
            </CardContent>
          </Card>

          {/* Income vs Expenses */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="gap-4">
              <CardTitle>Income vs expenses</CardTitle>

              <CardAction>
                <RadioGroup
                  value={chartType}
                  onChange={(value) => {
                    if (value === "area" || value === "bar") {
                      setChartType(value);
                    }
                  }}
                  orientation="horizontal"
                  aria-label="Chart type"
                  className="flex flex-wrap items-center gap-x-4 gap-y-2"
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
              </CardAction>
            </CardHeader>

            <CardContent className="min-w-0 overflow-hidden">
              {chartType === "area" ? (
                <AreaChartDisplay />
              ) : (
                <BarChartDisplay />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Detailed Reports */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Weekly Spending */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Spending</CardTitle>

              <CardDescription>Current month</CardDescription>

              <CardAction>
                <Select
                  placeholder="Select Category"
                  selectedKey={category}
                  onSelectionChange={(key) => {
                    setCategory(String(key));
                  }}
                >
                  <SelectTrigger className="w-45">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem id="all">All Categories</SelectItem>

                      <SelectItem id="Groceries">Groceries</SelectItem>

                      <SelectItem id="Dining">Dining</SelectItem>

                      <SelectItem id="Entertainment">Entertainment</SelectItem>

                      <SelectItem id="Transportation">
                        Transportation
                      </SelectItem>

                      <SelectItem id="Shopping">Shopping</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardAction>
            </CardHeader>

            <CardContent>
              <BarChart2
                category={category}
                month={selectedMonth}
                year={selectedYear}
              />
            </CardContent>
          </Card>

          {/* Budget vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>

              <CardDescription>Budgets vs Actual spending</CardDescription>

              <CardAction />
            </CardHeader>

            <CardContent>
              <BudgetCategoryChart month={selectedMonth} year={selectedYear} />
            </CardContent>
          </Card>

          {/* Monthly History */}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Monthly History</CardTitle>
            </CardHeader>

            <CardContent>
              <MonthlyHistory />
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>

            <CardContent>
              <CategoryBreakdown />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
};

export default Reports;
