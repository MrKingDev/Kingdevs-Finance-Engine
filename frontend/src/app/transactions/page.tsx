"use client";

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

import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";

import TransactionsTable from "@/components/transactions/transactionsTable";

const Transactions = () => {
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
                  <InputGroupInput placeholder="Search..." />

                  <InputGroupAddon>
                    <Search className="size-4" />
                  </InputGroupAddon>
                </InputGroup>

                {/* Type */}
                <Select placeholder="Pick a Type" className="w-full">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem>All Types</SelectItem>
                      <SelectItem>Income</SelectItem>
                      <SelectItem>Expenses</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Category */}
                <Select placeholder="Pick a Category" className="w-full">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem>All Categories</SelectItem>
                      <SelectItem>Shopping</SelectItem>
                      <SelectItem>Bills</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Bank */}
                <Select placeholder="Pick a Bank" className="w-full">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem>All Banks</SelectItem>
                      <SelectItem>Capital One</SelectItem>
                      <SelectItem>Bank Of America</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Start Date */}
                <DatePickerInput className="w-full" />

                {/* End Date */}
                <DatePickerInput className="w-full" />

                {/* Minimum Amount */}
                <Input
                  type="number"
                  placeholder="Minimum Amount"
                  className="w-full"
                />

                {/* Maximum Amount */}
                <Input
                  type="number"
                  placeholder="Maximum Amount"
                  className="w-full"
                />
              </div>
            </CardHeader>

            {/* Table */}
            <CardContent className="min-w-0">
              <Separator className="mb-4" />

              <TransactionsTable />
            </CardContent>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
};

export default Transactions;
