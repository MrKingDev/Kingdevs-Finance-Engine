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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
// Charts
import PieChartDisplay from "@/components/charts/pieChart";
import AreaChartDisplay from "@/components/charts/areaChart";
import BarChartDisplay from "@/components/charts/barChart";

const Reports = () => {
  const [chartType, setChartType] = React.useState<"area" | "bar">("area");
  return (
    <PageTransition>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Understand where your money comes from and where it goes.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardDescription>Monthly income</CardDescription>
            <CardTitle>$0.00</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Monthly expenses</CardDescription>
            <CardTitle>$0.00</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net cash flow</CardDescription>
            <CardTitle>$0.00</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartDisplay />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
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
            </CardAction>
          </CardHeader>
          <CardContent>
            {/* Radio Select */}
            {chartType === "area" ? <AreaChartDisplay /> : <BarChartDisplay />}
          </CardContent>
        </Card>
      </section>
    </PageTransition>
  );
};

export default Reports;
