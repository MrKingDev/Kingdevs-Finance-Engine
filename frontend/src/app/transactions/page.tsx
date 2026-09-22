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

const Transactions = () => {
  return (
    <PageTransition>
      <div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              Every movement, neatly organized.
            </p>
          </div>
          <div className="flex sm:w-auto">
            <Button aria-label="Add Transaction">
              <Plus />
              Add Transaction
            </Button>
          </div>
        </header>

        <section>
          <Card className="mt-4">
            <CardHeader className="grid grid-cols-4 gap-4">
              {/* Search Bar */}
              <InputGroup className="w-full">
                <InputGroupInput placeholder="Search..." />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>

              {/* Types */}
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

              {/* Categories */}
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

              {/* Banks */}
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

              {/* Dates */}
              <DatePickerInput className="w-full" />
              {/* Dates */}
              <DatePickerInput className="w-full" />

              {/* Min */}
              <Input
                type="number"
                placeholder="Minimum Amount"
                className="w-full"
              />
              {/* Max */}
              <Input
                type="number"
                placeholder="Maximum Amount"
                className="w-full"
              />
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
};

export default Transactions;
