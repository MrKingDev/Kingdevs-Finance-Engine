"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type PayPeriod =
  | "hourly"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

export default function SalaryConverter() {
  const [salary, setSalary] = React.useState("");
  const [payPeriod, setPayPeriod] = React.useState<PayPeriod>("yearly");

  const [hoursPerWeek, setHoursPerWeek] = React.useState(40);
  const [weeksPerYear, setWeeksPerYear] = React.useState(52);

  const salaryAmount = Math.max(Number(salary) || 0, 0);

  const hoursPerDay = hoursPerWeek / 5;

  /*
   * First convert the entered amount
   * into a yearly salary.
   */
  const yearlySalary = React.useMemo(() => {
    switch (payPeriod) {
      case "hourly":
        return salaryAmount * hoursPerWeek * weeksPerYear;

      case "daily":
        return salaryAmount * 5 * weeksPerYear;

      case "weekly":
        return salaryAmount * weeksPerYear;

      case "biweekly":
        return salaryAmount * (weeksPerYear / 2);

      case "monthly":
        return salaryAmount * 12;

      case "yearly":
        return salaryAmount;

      default:
        return 0;
    }
  }, [salaryAmount, payPeriod, hoursPerWeek, weeksPerYear]);

  /*
   * Convert yearly salary
   * into all other pay periods.
   */
  const hourly =
    hoursPerWeek > 0 && weeksPerYear > 0
      ? yearlySalary / (hoursPerWeek * weeksPerYear)
      : 0;

  const daily = hourly * hoursPerDay;

  const weekly = weeksPerYear > 0 ? yearlySalary / weeksPerYear : 0;

  const biweekly = weekly * 2;

  const monthly = yearlySalary / 12;

  const yearly = yearlySalary;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const conversions = [
    {
      label: "Hourly",
      value: hourly,
      suffix: "/ hr",
    },
    {
      label: "Daily",
      value: daily,
      suffix: "/ day",
    },
    {
      label: "Weekly",
      value: weekly,
      suffix: "/ week",
    },
    {
      label: "Biweekly",
      value: biweekly,
      suffix: "/ 2 weeks",
    },
    {
      label: "Monthly",
      value: monthly,
      suffix: "/ month",
    },
    {
      label: "Yearly",
      value: yearly,
      suffix: "/ year",
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Salary Converter</CardTitle>

        <CardDescription>
          Convert your salary between hourly, weekly, monthly, and yearly pay.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Salary Input */}
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="salary">Salary Amount</Label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>

              <Input
                id="salary"
                type="number"
                min="0"
                step="0.01"
                placeholder="60000"
                className="pl-7"
                value={salary}
                onChange={(event) => setSalary(event.target.value)}
              />
            </div>
          </div>

          {/* Pay Period */}
          <div className="space-y-2">
            <Label>Pay Period</Label>

            <Select
              value={payPeriod}
              onValueChange={(value) => setPayPeriod(value as PayPeriod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Work Schedule */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hours-per-week">Hours Per Week</Label>

            <Input
              id="hours-per-week"
              type="number"
              min="1"
              max="168"
              value={hoursPerWeek}
              onChange={(event) =>
                setHoursPerWeek(Math.max(1, Number(event.target.value) || 1))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeks-per-year">Weeks Per Year</Label>

            <Input
              id="weeks-per-year"
              type="number"
              min="1"
              max="52"
              value={weeksPerYear}
              onChange={(event) =>
                setWeeksPerYear(
                  Math.min(52, Math.max(1, Number(event.target.value) || 1)),
                )
              }
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Default calculation assumes 40 hours per week and 52 working weeks per
          year.
        </p>

        <Separator />

        {/* Main Result */}
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">
            Estimated Annual Salary
          </p>

          <p className="mt-1 text-3xl font-bold">
            {formatCurrency(yearlySalary)}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Based on {hoursPerWeek} hours per week and {weeksPerYear} weeks per
            year.
          </p>
        </div>

        {/* Conversions */}
        <div className="space-y-3">
          <h3 className="font-semibold">Salary Breakdown</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            {conversions.map((conversion) => (
              <div key={conversion.label} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  {conversion.label}
                </p>

                <div className="mt-1 flex items-baseline gap-1">
                  <p className="text-xl font-semibold">
                    {formatCurrency(conversion.value)}
                  </p>

                  <span className="text-sm text-muted-foreground">
                    {conversion.suffix}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Calculation Details */}
        <div className="space-y-3">
          <h3 className="font-semibold">Calculation Details</h3>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Hours per week</span>

            <span>{hoursPerWeek}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Weeks per year</span>

            <span>{weeksPerYear}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Estimated yearly hours
            </span>

            <span>{(hoursPerWeek * weeksPerYear).toLocaleString()}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Estimated hourly rate</span>

            <span className="font-semibold">{formatCurrency(hourly)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
