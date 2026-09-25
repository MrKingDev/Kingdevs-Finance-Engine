"use client";

import * as React from "react";

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

const Reports = () => {
  const [chartType, setChartType] = React.useState<"area" | "bar">("area");

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
        </header>

        {/* Report Metrics */}
        <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="min-w-0">
            <CardHeader>
              <CardDescription>Monthly income</CardDescription>

              <CardTitle className="text-xl">$0.00</CardTitle>
            </CardHeader>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardDescription>Monthly expenses</CardDescription>

              <CardTitle className="text-xl">$0.00</CardTitle>
            </CardHeader>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardDescription>Net cash flow</CardDescription>

              <CardTitle className="text-xl">$0.00</CardTitle>
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
              <PieChartDisplay />
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
          <Card>
            <CardHeader>
              <CardTitle>Weekly Spending</CardTitle>
              <CardDescription>January - June 2024</CardDescription>
              <CardAction>
                <Select placeholder="Select Category">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem>Item 1</SelectItem>
                      <SelectItem>Item 1</SelectItem>
                      <SelectItem>Item 1</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardAction>
            </CardHeader>
            <CardContent>
              <BarChart2 />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
              <CardDescription>Budgets vs Acutal spending</CardDescription>
              <CardAction></CardAction>
            </CardHeader>
            <CardContent>
              <BudgetCategoryChart />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Monthly History</CardTitle>
            </CardHeader>

            <CardContent>Content</CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>

            <CardContent>Content</CardContent>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
};

export default Reports;
