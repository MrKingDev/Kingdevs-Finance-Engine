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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";

import TransactionsTable from "@/components/transactions/transactionsTable";

const Transactions = () => {
  // States
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [bank, setBank] = useState("all");

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const clearFilters = () => {
    setSearch("");
    setType("all");
    setCategory("all");
    setBank("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
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

          <Button aria-label="Add Transaction" className="w-full sm:w-auto">
            <Plus className="size-4" />
            Add Transaction
          </Button>
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
                  value={type}
                  onChange={(value) => setType(String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem id="income">Income</SelectItem>
                      <SelectItem id="expense">Expenses</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Category */}
                <Select
                  placeholder="Pick a Category"
                  className="w-full"
                  value={category}
                  onChange={(value) => setCategory(String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Income</SelectLabel>
                      <SelectItem id="Salary">Salary</SelectItem>
                      <SelectItem id="Side Income">Side Income</SelectItem>
                      <SelectItem id="Interest">Interest</SelectItem>
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Expenses</SelectLabel>
                      <SelectItem id="Groceries">Groceries</SelectItem>
                      <SelectItem id="Dining">Dining</SelectItem>
                      <SelectItem id="Gas">Gas</SelectItem>
                      <SelectItem id="Subscriptions">Subscriptions</SelectItem>
                      <SelectItem id="Shopping">Shopping</SelectItem>
                      <SelectItem id="Utilities">Utilities</SelectItem>
                      <SelectItem id="Transportation">
                        Transportation
                      </SelectItem>
                      <SelectItem id="Entertainment">Entertainment</SelectItem>
                      <SelectItem id="Healthcare">Healthcare</SelectItem>
                      <SelectItem id="Phone">Phone</SelectItem>
                      <SelectItem id="Fitness">Fitness</SelectItem>
                      <SelectItem id="Electronics">Electronics</SelectItem>
                      <SelectItem id="Housing">Housing</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Bank */}
                <Select
                  placeholder="Pick a Bank"
                  className="w-full"
                  value={bank}
                  onChange={(value) => setBank(String(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
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
