"use client";

import { useState } from "react";

import PageTransition from "@/components/pageTransitions";

import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";

import TransactionsTable from "@/components/transactions/transactionsTable";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Category } from "@/types/api";

const Transactions = () => {
  const { data: categories } = useFinanceList<Category>("/categories");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // States
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState<string | null>(null);
  const [bank, setBank] = useState("all");

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const clearFilters = () => {
    setSearch("");
    setType("all");
    setCategory(null);
    setBank("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  const [addingTransaction, setAddingTransaction] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    merchant: "",
    category: "",
    bank: "",
    type: "expense" as "income" | "expense",
    amount: "",
  });

  const handleAddTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setAddingTransaction(true);
      setCreateError(null);

      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date,
          merchant: formData.merchant,
          category: formData.category,
          bank: formData.bank,
          type: formData.type,
          amount: formData.amount,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await apiError(response, "Unable to save transaction."),
        );
      }

      setIsDialogOpen(false);
      notifyFinanceChanged();

      setFormData({
        date: new Date().toISOString().split("T")[0],
        merchant: "",
        category: "",
        bank: "",
        type: "expense",
        amount: "",
      });
    } catch (error) {
      console.error("Add transaction error:", error);
      setCreateError(
        error instanceof Error ? error.message : "Unable to save transaction.",
      );
    } finally {
      setAddingTransaction(false);
    }
  };

  return (
    <PageTransition>
      <div className="w-full min-w-0">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>

            <p className="text-muted-foreground">
              Every movement, neatly organized.
            </p>
          </div>

          <DialogTrigger isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button aria-label="Add Transaction" className="w-full sm:w-auto">
              <Plus className="size-4" />
              Add Transaction
            </Button>

            <Dialog>
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>

              <div>
                <form onSubmit={handleAddTransaction} className="grid gap-4">
                  {/* Date */}
                  <div className="grid gap-2">
                    <Label htmlFor="transaction-date">Date</Label>

                    <DatePickerInput
                      id="transaction-date"
                      value={formData.date}
                      onChange={(date) =>
                        setFormData((current) => ({
                          ...current,
                          date,
                        }))
                      }
                      placeholder="Select transaction date"
                    />
                  </div>

                  {/* Merchant */}
                  <div className="grid gap-2">
                    <Label htmlFor="merchant">Merchant</Label>

                    <Input
                      id="merchant"
                      placeholder="Walmart"
                      value={formData.merchant}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          merchant: event.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Category */}
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>

                    <Input
                      id="category"
                      list="transaction-categories"
                      required
                      maxLength={100}
                      placeholder="Groceries"
                      value={formData.category}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          category: event.target.value,
                        })
                      }
                    />
                  </div>

                  <datalist id="transaction-categories">
                    {categories.map((item) => (
                      <option key={item.name} value={item.name} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    Use the budget's category to count this expense toward its
                    monthly limit.
                  </p>
                  {createError && (
                    <p role="alert" className="text-sm text-destructive">
                      {createError}
                    </p>
                  )}
                  {/* Bank */}
                  <div className="grid gap-2">
                    <Label htmlFor="bank">Bank</Label>

                    <Input
                      id="bank"
                      placeholder="Chase"
                      value={formData.bank}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          bank: event.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Type */}
                  <div className="grid gap-2">
                    <Label>Type</Label>

                    <Select
                      className="w-full"
                      selectedKey={formData.type}
                      onSelectionChange={(key) =>
                        setFormData((current) => ({
                          ...current,
                          type: key as "income" | "expense",
                        }))
                      }
                    >
                      <SelectTrigger id="transaction-type">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem id="expense">Expense</SelectItem>
                        <SelectItem id="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>

                    <Input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          amount: event.target.value,
                        })
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    isDisabled={addingTransaction}
                  >
                    {addingTransaction ? "Adding..." : "Add Transaction"}
                  </Button>
                </form>
              </div>
            </Dialog>
          </DialogTrigger>
        </header>

        {/* Filters + Table */}
        <section className="mt-4">
          <Card className="w-full">
            {/* Filters */}
            <CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* Search */}
                <InputGroup className="w-full">
                  <InputGroupInput
                    placeholder="Search..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />

                  <InputGroupAddon>
                    <Search className="size-4" />
                  </InputGroupAddon>
                </InputGroup>

                {/* Type */}
                <Select
                  placeholder="Pick a Type"
                  className="w-full"
                  selectedKey={type}
                  onSelectionChange={(value) =>
                    value !== null && setType(String(value))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem id="all">All types</SelectItem>
                      <SelectItem id="income">Income</SelectItem>
                      <SelectItem id="expense">Expenses</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Category */}
                <Select
                  placeholder="Pick a Category"
                  className="w-full"
                  selectedKey={
                    category === null ? "all" : `category:${category}`
                  }
                  onSelectionChange={(value) => {
                    if (value !== null)
                      setCategory(
                        value === "all"
                          ? null
                          : String(value).slice("category:".length),
                      );
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem id="all">All categories</SelectItem>
                    {categories.map((item) => (
                      <SelectItem key={item.name} id={`category:${item.name}`}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Bank */}
                <Select
                  placeholder="Pick a Bank"
                  className="w-full"
                  selectedKey={bank}
                  onSelectionChange={(value) =>
                    value !== null && setBank(String(value))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem id="all">All banks</SelectItem>
                      <SelectItem id="Capital One">Capital One</SelectItem>
                      <SelectItem id="Chase">Chase</SelectItem>
                      <SelectItem id="Bank of America">
                        Bank of America
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Start Date */}
                <DatePickerInput
                  className="w-full"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start Date"
                />

                {/* End Date */}
                <DatePickerInput
                  className="w-full"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End Date"
                />

                {/* Minimum Amount */}
                <Input
                  type="number"
                  placeholder="Minimum Amount"
                  className="w-full"
                  value={minAmount}
                  onChange={(event) => setMinAmount(event.target.value)}
                />

                {/* Maximum Amount */}
                <Input
                  type="number"
                  placeholder="Maximum Amount"
                  className="w-full"
                  value={maxAmount}
                  onChange={(event) => setMaxAmount(event.target.value)}
                />
              </div>
            </CardHeader>

            {/* Table */}
            <CardContent className="min-w-0">
              <Separator className="mb-4" />

              <TransactionsTable
                search={search}
                type={type}
                category={category}
                bank={bank}
                startDate={startDate}
                endDate={endDate}
                minAmount={minAmount}
                maxAmount={maxAmount}
                onClearFilters={clearFilters}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
};

export default Transactions;
