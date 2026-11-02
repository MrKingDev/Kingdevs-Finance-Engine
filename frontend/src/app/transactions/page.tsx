"use client";

import { Copy, Plus, Search } from "lucide-react";
import { useState } from "react";
import BankBadge from "@/components/banks/bankBadge";
import BankSelect from "@/components/banks/bankSelect";
import CategorySelect from "@/components/categories/categorySelect";
import PageTransition from "@/components/pageTransitions";
import TransactionsTable from "@/components/transactions/transactionsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Transaction } from "@/types/api";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";

const emptyTransaction = (today: string) => {
  return {
    date: today,
    merchant: "",
    category: "",
    bank: "",
    type: "expense" as Transaction["type"],
    amount: "",
  };
};

const Transactions = () => {
  const { today } = useRegionalFormat();
  const banks = useFinanceList<string>("/transactions/banks");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
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

  const [formData, setFormData] = useState(() => emptyTransaction(today()));

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setIsDuplicate(false);
    setCreateError(null);
    setFormData({
      date: transaction.date,
      merchant: transaction.merchant,
      category: transaction.category,
      bank: transaction.bank,
      type: transaction.type,
      amount: transaction.amount,
    });
    setIsDialogOpen(true);
  };

  const handleAddTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (addingTransaction) return;

    try {
      setAddingTransaction(true);
      setCreateError(null);

      if (!formData.category) {
        setCreateError("Select a category. Create one in Settings if needed.");
        return;
      }
      if (
        !formData.date ||
        !formData.merchant.trim() ||
        !formData.bank.trim()
      ) {
        setCreateError("Enter a date, merchant, and bank.");
        return;
      }

      const response = await fetch(
        `${API_URL}/transactions${editingId !== null ? `/${editingId}` : ""}`,
        {
          method: editingId !== null ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: formData.date,
            merchant: formData.merchant.trim(),
            category: formData.category,
            bank: formData.bank.trim(),
            type: formData.type,
            amount: formData.amount,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await apiError(response, "Unable to save transaction."),
        );
      }

      setIsDialogOpen(false);
      notifyFinanceChanged();

      setFormData(emptyTransaction(today()));
      setEditingId(null);
      setIsDuplicate(false);
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

          <DialogTrigger
            isOpen={isDialogOpen}
            onOpenChange={(open) => {
              if (!addingTransaction) setIsDialogOpen(open);
            }}
          >
            <Button
              aria-label="Add Transaction"
              className="w-full sm:w-auto"
              onPress={() => {
                setEditingId(null);
                setIsDuplicate(false);
                setCreateError(null);
                setFormData(emptyTransaction(today()));
              }}
            >
              <Plus className="size-4" />
              Add Transaction
            </Button>

            <Dialog
              className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
              isDismissable={!addingTransaction}
              showCloseButton={!addingTransaction}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingId !== null
                    ? "Edit Transaction"
                    : isDuplicate
                      ? "Duplicate Transaction"
                      : "Add Transaction"}
                </DialogTitle>
                {isDuplicate && (
                  <p className="text-sm text-muted-foreground">
                    Edit this copy, then save it as a new transaction.
                  </p>
                )}
              </DialogHeader>

              <div>
                <form onSubmit={handleAddTransaction} className="grid gap-4">
                  {/* Date */}
                  <div className="grid gap-2">
                    <Label htmlFor="transaction-date-input">Date</Label>

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
                      disabled={addingTransaction}
                    />
                  </div>

                  {/* Merchant */}
                  <div className="grid gap-2">
                    <Label htmlFor="merchant">Merchant</Label>

                    <Input
                      id="merchant"
                      required
                      maxLength={255}
                      disabled={addingTransaction}
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
                    <p className="text-sm font-medium">Category</p>
                    <CategorySelect
                      value={formData.category || null}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          category: value ?? "",
                        }))
                      }
                      required
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Use the budget's category to count this expense toward its
                    monthly limit.
                  </p>
                  {/* Bank */}
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Bank</p>
                    <BankSelect
                      value={formData.bank}
                      disabled={addingTransaction}
                      onChange={(bank) =>
                        setFormData((current) => ({ ...current, bank }))
                      }
                    />
                  </div>

                  {/* Type */}
                  <div className="grid gap-2">
                    <p
                      id="transaction-type-label"
                      className="text-sm font-medium"
                    >
                      Type
                    </p>
                    <ToggleGroup
                      aria-labelledby="transaction-type-label"
                      className="w-full"
                      variant="outline"
                      spacing={0}
                      selectionMode="single"
                      disallowEmptySelection
                      isDisabled={addingTransaction}
                      selectedKeys={[formData.type]}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0];
                        if (selected === "expense" || selected === "income")
                          setFormData((current) => ({
                            ...current,
                            type: selected,
                          }));
                      }}
                    >
                      <ToggleGroupItem
                        id="expense"
                        className="flex-1 data-selected:bg-primary data-selected:text-primary-foreground"
                      >
                        Expense
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        id="income"
                        className="flex-1 data-selected:bg-primary data-selected:text-primary-foreground"
                      >
                        Income
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Amount */}
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>

                    <Input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      max="9999999999.99"
                      disabled={addingTransaction}
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

                  {createError && (
                    <p role="alert" className="text-sm text-destructive">
                      {createError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editingId !== null && (
                      <Button
                        type="button"
                        variant="outline"
                        isDisabled={addingTransaction}
                        onPress={() => {
                          setEditingId(null);
                          setIsDuplicate(true);
                          setCreateError(null);
                        }}
                      >
                        <Copy className="size-4" />
                        Duplicate
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      isDisabled={addingTransaction}
                      onPress={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      isDisabled={addingTransaction}
                    >
                      {addingTransaction
                        ? "Saving..."
                        : editingId !== null
                          ? "Save Changes"
                          : isDuplicate
                            ? "Create Duplicate"
                            : "Add Transaction"}
                    </Button>
                  </div>
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
                <CategorySelect
                  value={category}
                  onChange={setCategory}
                  allowAll
                  label="Filter by category"
                />

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
                      {banks.data.map((name) => (
                        <SelectItem key={name} id={name} textValue={name}>
                          <BankBadge bank={name} />
                        </SelectItem>
                      ))}
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
                onEdit={handleEditTransaction}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
};

export default Transactions;
