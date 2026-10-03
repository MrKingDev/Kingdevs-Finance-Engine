"use client";

import * as React from "react";
import Link from "next/link";

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

import { Label } from "@/components/ui/label";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Charts
import PieChartDisplay from "@/components/charts/pieChart";
import AreaChartDisplay from "@/components/charts/areaChart";
import BarChartDisplay from "@/components/charts/barChart";
import BudgetCategoryChart from "@/components/charts/budgetCategoryChart";

// Data
import RecentTransactions from "@/components/dashboard/recentTransactions";

type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  bank: string;
  type: "income" | "expense";
  amount: number;
};

const Dashboard = () => {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = React.useState(
    today.getMonth() + 1,
  );

  const [selectedYear, setSelectedYear] = React.useState(today.getFullYear());

  const [chartType, setChartType] = React.useState<"area" | "bar">("area");

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  const [loading, setLoading] = React.useState(true);

  // Fetch transactions
  React.useEffect(() => {
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

  // Dashboard metrics
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    balanceThroughMonth,
  } = React.useMemo(() => {
    let income = 0;
    let expenses = 0;
    let balance = 0;

    transactions.forEach((transaction) => {
      const [transactionYear, transactionMonth] = transaction.date
        .split("-")
        .map(Number);

      const amount = Number(transaction.amount);

      // Selected month totals
      if (
        transactionYear === selectedYear &&
        transactionMonth === selectedMonth
      ) {
        if (transaction.type === "income") {
          income += amount;
        }

        if (transaction.type === "expense") {
          expenses += amount;
        }
      }

      // Balance through end of selected month
      const isBeforeSelectedYear = transactionYear < selectedYear;

      const isSelectedYearAndBeforeOrEqualMonth =
        transactionYear === selectedYear && transactionMonth <= selectedMonth;

      if (isBeforeSelectedYear || isSelectedYearAndBeforeOrEqualMonth) {
        if (transaction.type === "income") {
          balance += amount;
        }

        if (transaction.type === "expense") {
          balance -= amount;
        }
      }
    });

    return {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlySavings: income - expenses,
      balanceThroughMonth: balance,
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
      <main className="flex flex-col gap-4">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>

            <p className="text-muted-foreground">
              A clear picture of your money for {selectedMonthName}{" "}
              {selectedYear}.
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

            {/* <Link href="/transactions">
              <Button aria-label="Add Transaction">
                <Plus />
                Add Transaction
              </Button>
            </Link> */}
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Balance through month"
            value={loading ? "Loading..." : formatCurrency(balanceThroughMonth)}
            icon={<CircleDollarSign size={19} />}
            bg="bg-metric-1-bg"
            text="text-metric-1-text"
          />

          <Metric
            label="Income"
            value={loading ? "Loading..." : formatCurrency(monthlyIncome)}
            icon={<ArrowDownLeft size={19} />}
            bg="bg-metric-2-bg"
            text="text-metric-2-text"
          />

          <Metric
            label="Expenses"
            value={loading ? "Loading..." : formatCurrency(monthlyExpenses)}
            icon={<ArrowUpRight size={19} />}
            bg="bg-metric-3-bg"
            text="text-metric-3-text"
          />

          <Metric
            label="Savings"
            value={loading ? "Loading..." : formatCurrency(monthlySavings)}
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

              <CardDescription>
                {selectedMonthName} {selectedYear}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <PieChartDisplay month={selectedMonth} year={selectedYear} />
            </CardContent>
          </Card>

          {/* Income vs Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Income vs Expenses</CardTitle>

                <CardDescription>{selectedYear}</CardDescription>
              </div>

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
            </CardHeader>

            <CardContent>
              {chartType === "area" ? (
                <AreaChartDisplay />
              ) : (
                <BarChartDisplay />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Looks */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Budget Progress</CardTitle>

              <Link href="/budgets">
                <Button variant="link">Manage Budgets</Button>
              </Link>
            </CardHeader>

            <CardContent>
              <BudgetCategoryChart month={selectedMonth} year={selectedYear} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>

              <Link href="/transactions">
                <Button variant="link">View All</Button>
              </Link>
            </CardHeader>

            <CardContent>
              <RecentTransactions />
            </CardContent>
          </Card>
        </section>
      </main>
    </PageTransition>
  );
};

export default Dashboard;
