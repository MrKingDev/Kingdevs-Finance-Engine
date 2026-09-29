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

type CompoundFrequency = "1" | "4" | "12" | "365";

export default function CompoundInterest() {
  const [principal, setPrincipal] = React.useState("");
  const [interestRate, setInterestRate] = React.useState("");
  const [years, setYears] = React.useState("");
  const [monthlyContribution, setMonthlyContribution] = React.useState("");
  const [compoundFrequency, setCompoundFrequency] =
    React.useState<CompoundFrequency>("12");

  const startingAmount = Math.max(Number(principal) || 0, 0);
  const annualRate = Math.max(Number(interestRate) || 0, 0) / 100;
  const investmentYears = Math.max(Number(years) || 0, 0);
  const monthlyDeposit = Math.max(Number(monthlyContribution) || 0, 0);

  const compoundsPerYear = Number(compoundFrequency);

  /*
   * Principal compound interest:
   *
   * A = P(1 + r/n)^(nt)
   */
  const principalGrowth =
    startingAmount *
    Math.pow(
      1 + annualRate / compoundsPerYear,
      compoundsPerYear * investmentYears,
    );

  /*
   * Monthly contribution growth
   *
   * Because contributions happen monthly,
   * calculate each month's contribution
   * separately.
   */
  const calculateContributionsGrowth = () => {
    if (monthlyDeposit <= 0 || investmentYears <= 0 || annualRate < 0) {
      return 0;
    }

    const totalMonths = Math.round(investmentYears * 12);

    let balance = 0;

    const monthlyRate =
      Math.pow(1 + annualRate / compoundsPerYear, compoundsPerYear / 12) - 1;

    for (let month = 0; month < totalMonths; month++) {
      balance *= 1 + monthlyRate;
      balance += monthlyDeposit;
    }

    return balance;
  };

  const contributionGrowth = calculateContributionsGrowth();

  const finalBalance = principalGrowth + contributionGrowth;

  const totalMonthlyContributions =
    monthlyDeposit * Math.round(investmentYears * 12);

  const totalContributions = startingAmount + totalMonthlyContributions;

  const interestEarned = Math.max(finalBalance - totalContributions, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Compound Interest Calculator</CardTitle>

        <CardDescription>
          See how your money can grow over time with compound interest and
          recurring contributions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Starting Amount */}
        <div className="space-y-2">
          <Label htmlFor="principal">Starting Amount</Label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>

            <Input
              id="principal"
              type="number"
              min="0"
              step="0.01"
              placeholder="5000"
              className="pl-7"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
            />
          </div>
        </div>

        {/* Interest + Years */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="interest">Annual Interest Rate</Label>

            <div className="relative">
              <Input
                id="interest"
                type="number"
                min="0"
                step="0.01"
                placeholder="7"
                className="pr-8"
                value={interestRate}
                onChange={(event) => setInterestRate(event.target.value)}
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="years">Years</Label>

            <Input
              id="years"
              type="number"
              min="0"
              step="1"
              placeholder="10"
              value={years}
              onChange={(event) => setYears(event.target.value)}
            />
          </div>
        </div>

        {/* Monthly Contributions */}
        <div className="space-y-2">
          <Label htmlFor="monthly-contribution">Monthly Contribution</Label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>

            <Input
              id="monthly-contribution"
              type="number"
              min="0"
              step="0.01"
              placeholder="200"
              className="pl-7"
              value={monthlyContribution}
              onChange={(event) => setMonthlyContribution(event.target.value)}
            />
          </div>
        </div>

        {/* Compounding Frequency */}
        <div className="space-y-2">
          <Label>Compounding Frequency</Label>

          <Select
            value={compoundFrequency}
            onValueChange={(value) =>
              setCompoundFrequency(value as CompoundFrequency)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="1">Annually</SelectItem>

              <SelectItem value="4">Quarterly</SelectItem>

              <SelectItem value="12">Monthly</SelectItem>

              <SelectItem value="365">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Main Result */}
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">
            Estimated Future Value
          </p>

          <p className="mt-1 text-3xl font-bold">
            {formatCurrency(finalBalance)}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            After {investmentYears || 0}{" "}
            {investmentYears === 1 ? "year" : "years"}
          </p>
        </div>

        {/* Results */}
        <div className="grid gap-3 sm:grid-cols-3">
          <ResultCard
            label="Contributed"
            value={formatCurrency(totalContributions)}
          />

          <ResultCard
            label="Interest Earned"
            value={formatCurrency(interestEarned)}
          />

          <ResultCard
            label="Final Balance"
            value={formatCurrency(finalBalance)}
          />
        </div>

        <Separator />

        {/* Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold">Investment Breakdown</h3>

          <BreakdownRow
            label="Starting amount"
            value={formatCurrency(startingAmount)}
          />

          <BreakdownRow
            label="Monthly contribution"
            value={formatCurrency(monthlyDeposit)}
          />

          <BreakdownRow
            label="Monthly contributions made"
            value={Math.round(investmentYears * 12).toLocaleString()}
          />

          <BreakdownRow
            label="Total monthly contributions"
            value={formatCurrency(totalMonthlyContributions)}
          />

          <BreakdownRow
            label="Total invested"
            value={formatCurrency(totalContributions)}
          />

          <BreakdownRow
            label="Interest earned"
            value={formatCurrency(interestEarned)}
          />

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Final balance</span>

            <span className="font-semibold">
              {formatCurrency(finalBalance)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ResultCardProps = {
  label: string;
  value: string;
};

function ResultCard({ label, value }: ResultCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>

      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

type BreakdownRowProps = {
  label: string;
  value: string;
};

function BreakdownRow({ label, value }: BreakdownRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>

      <span>{value}</span>
    </div>
  );
}
