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

import PieChartDisplay from "@/components/charts/pieChart";
import AreaChartDisplay from "@/components/charts/areaChart";
import BarChartDisplay from "@/components/charts/barChart";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Data
import RecentTransactions from "@/components/dashboard/recentTransactions";

const Dashboard = () => {
  const today = new Date();

  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

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
              <PieChartDisplay />
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
              <CardTitle>Budget progress</CardTitle>
              <Link href="/budgets">
                <Button variant="link">Manage Budgets</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent transactions</CardTitle>
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
