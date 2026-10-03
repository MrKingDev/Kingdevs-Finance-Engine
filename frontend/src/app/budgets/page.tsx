"use client";

import * as React from "react";

import PageTransition from "@/components/pageTransitions";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus } from "lucide-react";

import BudgetCard from "@/components/budgets/budgetCard";
import type { Budget, Category } from "@/types/api";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";

const monthOptions = [
  {
    value: 1,
    label: "January",
  },
  {
    value: 2,
    label: "February",
  },
  {
    value: 3,
    label: "March",
  },
  {
    value: 4,
    label: "April",
  },
  {
    value: 5,
    label: "May",
  },
  {
    value: 6,
    label: "June",
  },
  {
    value: 7,
    label: "July",
  },
  {
    value: 8,
    label: "August",
  },
  {
    value: 9,
    label: "September",
  },
  {
    value: 10,
    label: "October",
  },
  {
    value: 11,
    label: "November",
  },
  {
    value: 12,
    label: "December",
  },
];

const Budgets = () => {
  const {
    data: budgets,
    loading: isLoading,
    error,
  } = useFinanceList<Budget>("/budgets");
  const { data: categories } = useFinanceList<Category>("/categories");
  const [category, setCategory] = React.useState("");
  const [scope, setScope] = React.useState("category");

  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const [actionError, setActionError] = React.useState<string | null>(null);

  // Create budget dialog
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const [month, setMonth] = React.useState(new Date().getMonth() + 1);

  const [year, setYear] = React.useState(new Date().getFullYear());

  const [amount, setAmount] = React.useState("");

  const [isCreating, setIsCreating] = React.useState(false);

  const [createError, setCreateError] = React.useState<string | null>(null);

  const handleCreateBudget = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setIsCreating(true);
      setCreateError(null);

      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setCreateError("Budget amount must be greater than 0.");

        return;
      }
      if (scope === "category" && !category.trim()) {
        setCreateError("Choose or enter a category.");
        return;
      }

      const response = await fetch(`${API_URL}/budgets`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          month,
          year,
          amount,
          category: scope === "category" ? category.trim() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await apiError(response, "Failed to create budget."));
      }

      notifyFinanceChanged();
      setCategory("");

      setAmount("");

      setMonth(new Date().getMonth() + 1);

      setYear(new Date().getFullYear());

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to create budget:", error);

      setCreateError(
        error instanceof Error ? error.message : "Failed to create budget.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    try {
      setDeletingId(id);
      setActionError(null);

      const response = await fetch(`${API_URL}/budgets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      notifyFinanceChanged();
    } catch (error) {
      console.error("Failed to delete budget:", error);
      setActionError("Unable to delete budget. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition>
      <div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Budgets</h1>

            <p className="text-muted-foreground">
              Set a monthly limit for a category. Matching expenses count
              automatically.
            </p>
          </div>

          <div className="flex sm:w-auto">
            <DialogTrigger isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Button aria-label="Add Budget">
                <Plus className="size-4" />
                Add Budget
              </Button>

              <Dialog>
                <DialogHeader>
                  <DialogTitle>Create A Budget</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreateBudget} className="mt-4 space-y-5">
                  <Select
                    aria-label="Budget scope"
                    selectedKey={scope}
                    onSelectionChange={(key) =>
                      key !== null && setScope(String(key))
                    }
                    className="w-full"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="category">One category</SelectItem>
                      <SelectItem id="overall">All categories</SelectItem>
                    </SelectContent>
                  </Select>
                  {scope === "category" ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="budget-category"
                        className="text-sm font-medium"
                      >
                        Category
                      </label>
                      <Input
                        id="budget-category"
                        list="budget-categories"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        maxLength={100}
                        required
                        placeholder="e.g. Groceries"
                      />
                      <datalist id="budget-categories">
                        {categories.map((item) => (
                          <option key={item.name} value={item.name} />
                        ))}
                      </datalist>
                      <p className="text-xs text-muted-foreground">
                        Choose an existing category or type a new one. Use the
                        same category when adding expenses.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Tracks all expenses in this month. This total overlaps
                      your category budgets.
                    </p>
                  )}
                  {/* Month */}
                  <div className="space-y-2">
                    <label
                      htmlFor="budget-month"
                      className="text-sm font-medium"
                    >
                      Month
                    </label>

                    <Select
                      className="w-full"
                      selectedKey={String(month)}
                      onSelectionChange={(key) => {
                        if (key !== null) {
                          setMonth(Number(key));
                        }
                      }}
                    >
                      <SelectTrigger id="budget-month" className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {monthOptions.map((monthOption) => (
                          <SelectItem
                            key={monthOption.value}
                            id={String(monthOption.value)}
                          >
                            {monthOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year */}
                  <div className="space-y-2">
                    <label
                      htmlFor="budget-year"
                      className="text-sm font-medium"
                    >
                      Year
                    </label>

                    <Input
                      id="budget-year"
                      type="number"
                      min={2000}
                      max={2100}
                      value={String(year)}
                      onChange={(event) => setYear(Number(event.target.value))}
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <label
                      htmlFor="budget-amount"
                      className="text-sm font-medium"
                    >
                      Budget Amount
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>

                      <Input
                        id="budget-amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="1500.00"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>

                  {createError && (
                    <p className="text-sm text-destructive">{createError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      isDisabled={isCreating}
                      onPress={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>

                    <Button type="submit" isDisabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Budget"}
                    </Button>
                  </div>
                </form>
              </Dialog>
            </DialogTrigger>
          </div>
        </header>

        {isLoading && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">Loading budgets...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="mt-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {actionError && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {actionError}
          </p>
        )}

        {!isLoading && !error && budgets.length === 0 && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              No budgets yet. Create your first budget to get started.
            </p>
          </div>
        )}

        {!isLoading && !error && budgets.length > 0 && (
          <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onDelete={handleDeleteBudget}
                isDeleting={deletingId === budget.id}
              />
            ))}
          </section>
        )}
      </div>
    </PageTransition>
  );
};

export default Budgets;
