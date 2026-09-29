"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SplitCategory = {
  id: string;
  name: string;
  percentage: number;
};

export default function PaycheckSplitter() {
  const [paycheck, setPaycheck] = React.useState("");

  // Tithes
  const [includeTithes, setIncludeTithes] = React.useState(true);
  const [tithePercentage, setTithePercentage] = React.useState(10);

  // Categories
  const [categories, setCategories] = React.useState<SplitCategory[]>([
    {
      id: crypto.randomUUID(),
      name: "Needs",
      percentage: 50,
    },
    {
      id: crypto.randomUUID(),
      name: "Wants",
      percentage: 30,
    },
    {
      id: crypto.randomUUID(),
      name: "Savings",
      percentage: 20,
    },
  ]);

  const paycheckAmount = Math.max(Number(paycheck) || 0, 0);

  /*
   * TITHE CALCULATION
   *
   * Paycheck × Tithe %
   */
  const titheAmount = includeTithes
    ? paycheckAmount * (tithePercentage / 100)
    : 0;

  /*
   * Money available AFTER tithes
   */
  const amountAfterTithes = paycheckAmount - titheAmount;

  /*
   * Total category percentage
   */
  const totalPercentage = categories.reduce(
    (total, category) => total + category.percentage,
    0,
  );

  const remainingPercentage = 100 - totalPercentage;

  /*
   * Add new category
   */
  const addCategory = () => {
    setCategories((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        percentage: 0,
      },
    ]);
  };

  /*
   * Update category name
   */
  const updateCategoryName = (id: string, name: string) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === id ? { ...category, name } : category,
      ),
    );
  };

  /*
   * Update category percentage
   */
  const updateCategoryPercentage = (id: string, percentage: number) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === id
          ? {
              ...category,
              percentage: Math.max(0, percentage),
            }
          : category,
      ),
    );
  };

  /*
   * Delete category
   */
  const removeCategory = (id: string) => {
    setCategories((current) =>
      current.filter((category) => category.id !== id),
    );
  };

  /*
   * Calculate category amount
   *
   * Remaining paycheck × category %
   */
  const calculateCategoryAmount = (percentage: number) => {
    return amountAfterTithes * (percentage / 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Paycheck Splitter</CardTitle>

        <CardDescription>
          Customize how you want to divide your paycheck.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Paycheck */}
        <div className="space-y-2">
          <Label htmlFor="paycheck">Paycheck Amount</Label>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>

            <Input
              id="paycheck"
              type="number"
              min="0"
              step="0.01"
              placeholder="1000.00"
              className="pl-7"
              value={paycheck}
              onChange={(event) => setPaycheck(event.target.value)}
            />
          </div>
        </div>

        {/* Tithes */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="tithes">Include Tithes?</Label>

              <p className="text-sm text-muted-foreground">
                Take tithes out before splitting the remaining paycheck.
              </p>
            </div>

            <Switch
              id="tithes"
              checked={includeTithes}
              onCheckedChange={setIncludeTithes}
            />
          </div>

          {includeTithes && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="tithe-percentage">Tithe Percentage</Label>

                <div className="relative mt-2">
                  <Input
                    id="tithe-percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={tithePercentage}
                    onChange={(event) =>
                      setTithePercentage(
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                    className="pr-8"
                  />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              <div className="mt-6 min-w-24 text-right">
                <p className="font-semibold">{formatCurrency(titheAmount)}</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Split Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Paycheck Split</h3>

            <p className="text-sm text-muted-foreground">
              Your categories should add up to 100%.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCategory}
          >
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {categories.map((category) => {
            const amount = calculateCategoryAmount(category.percentage);

            return (
              <div
                key={category.id}
                className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_110px_120px_auto] sm:items-end"
              >
                {/* Category Name */}
                <div className="space-y-2">
                  <Label>Category</Label>

                  <Input
                    placeholder="Debt"
                    value={category.name}
                    onChange={(event) =>
                      updateCategoryName(category.id, event.target.value)
                    }
                  />
                </div>

                {/* Percentage */}
                <div className="space-y-2">
                  <Label>Percentage</Label>

                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={category.percentage}
                      onChange={(event) =>
                        updateCategoryPercentage(
                          category.id,
                          Number(event.target.value) || 0,
                        )
                      }
                      className="pr-8"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount</Label>

                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 font-medium">
                    {formatCurrency(amount)}
                  </div>
                </div>

                {/* Delete */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCategory(category.id)}
                  disabled={categories.length === 1}
                  aria-label={`Delete ${category.name || "category"}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Percentage Status */}
        <div
          className={`rounded-lg border p-4 ${
            totalPercentage === 100
              ? "border-green-500/30 bg-green-500/5"
              : totalPercentage > 100
                ? "border-destructive/30 bg-destructive/5"
                : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total allocation</span>

            <span className="font-semibold">{totalPercentage}%</span>
          </div>

          <div className="mt-2">
            {totalPercentage === 100 && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Your entire paycheck has been allocated.
              </p>
            )}

            {totalPercentage < 100 && (
              <p className="text-sm text-muted-foreground">
                {remainingPercentage}% still needs to be allocated.
              </p>
            )}

            {totalPercentage > 100 && (
              <p className="text-sm text-destructive">
                You are {Math.abs(remainingPercentage)}% over your available
                allocation.
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-4">
          {/* Paycheck */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Paycheck</span>

            <span className="font-medium">
              {formatCurrency(paycheckAmount)}
            </span>
          </div>

          {/* Available After Tithes */}
          {includeTithes && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Available After Tithes
              </span>

              <span className="font-medium">
                {formatCurrency(amountAfterTithes)}
              </span>
            </div>
          )}

          <Separator />

          {/* Category Breakdown */}
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{category.name || "Untitled"}</p>

                  <p className="text-sm text-muted-foreground">
                    {category.percentage}%
                  </p>
                </div>

                <p className="font-semibold">
                  {formatCurrency(calculateCategoryAmount(category.percentage))}
                </p>
              </div>
            ))}
          </div>

          {/* Tithe Amount */}
          {includeTithes && (
            <>
              <Separator />

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Tithes to Give</p>

                    <p className="text-sm text-muted-foreground">
                      {tithePercentage}% of your paycheck
                    </p>
                  </div>

                  <p className="text-xl font-bold">
                    {formatCurrency(titheAmount)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
