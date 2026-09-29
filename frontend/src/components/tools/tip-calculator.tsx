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
import { Separator } from "@/components/ui/separator";

export default function BillSplitter() {
  const [billAmount, setBillAmount] = React.useState("");
  const [tipPercentage, setTipPercentage] = React.useState(15);
  const [taxPercentage, setTaxPercentage] = React.useState(0);
  const [people, setPeople] = React.useState(2);

  const bill = Math.max(Number(billAmount) || 0, 0);

  const tip = bill * (tipPercentage / 100);

  const tax = bill * (taxPercentage / 100);

  const total = bill + tip + tax;

  const perPerson = people > 0 ? total / people : 0;

  const tipPerPerson = people > 0 ? tip / people : 0;

  const taxPerPerson = people > 0 ? tax / people : 0;

  const billPerPerson = people > 0 ? bill / people : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bill Splitter</CardTitle>

        <CardDescription>
          Split a bill between multiple people with optional tip and tax.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bill Amount */}
        <div className="space-y-2">
          <Label htmlFor="bill">Bill Amount</Label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>

            <Input
              id="bill"
              type="number"
              min="0"
              step="0.01"
              placeholder="120.00"
              className="pl-7"
              value={billAmount}
              onChange={(event) => setBillAmount(event.target.value)}
            />
          </div>
        </div>

        {/* Tip + Tax */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Tip */}
          <div className="space-y-2">
            <Label htmlFor="tip">Tip</Label>

            <div className="relative">
              <Input
                id="tip"
                type="number"
                min="0"
                value={tipPercentage}
                onChange={(event) =>
                  setTipPercentage(Math.max(0, Number(event.target.value) || 0))
                }
                className="pr-8"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>

          {/* Tax */}
          <div className="space-y-2">
            <Label htmlFor="tax">Tax</Label>

            <div className="relative">
              <Input
                id="tax"
                type="number"
                min="0"
                value={taxPercentage}
                onChange={(event) =>
                  setTaxPercentage(Math.max(0, Number(event.target.value) || 0))
                }
                className="pr-8"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Number of People */}
        <div className="space-y-2">
          <Label htmlFor="people">Number of People</Label>

          <Input
            id="people"
            type="number"
            min="1"
            step="1"
            value={people}
            onChange={(event) =>
              setPeople(
                Math.max(1, Math.floor(Number(event.target.value) || 1)),
              )
            }
          />
        </div>

        <Separator />

        {/* Per Person */}
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">Each Person Pays</p>

          <p className="mt-1 text-3xl font-bold">{formatCurrency(perPerson)}</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Split between {people} {people === 1 ? "person" : "people"}
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold">Bill Breakdown</h3>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bill</span>

            <span>{formatCurrency(bill)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Tip ({tipPercentage}%)
            </span>

            <span>{formatCurrency(tip)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Tax ({taxPercentage}%)
            </span>

            <span>{formatCurrency(tax)}</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>

            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <Separator />

        {/* Per Person Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold">Per Person Breakdown</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <ResultCard label="Bill" value={formatCurrency(billPerPerson)} />

            <ResultCard label="Tip" value={formatCurrency(tipPerPerson)} />

            <ResultCard label="Tax" value={formatCurrency(taxPerPerson)} />

            <ResultCard label="Total" value={formatCurrency(perPerson)} />
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

      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
