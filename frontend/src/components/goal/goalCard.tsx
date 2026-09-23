import { Trash } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { DatePickerInput } from "@/components/ui/date-picker";

const target = 50.0;

const type = ["Savings", "Debt Payoff"];

const date = "Sep 25, 2026";

const GoalCard = () => {
  return (
    <Card className="h-full w-full">
      {/* Header */}
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="min-w-0 space-y-1">
          <p className="truncate text-lg font-semibold">Goal Title</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-normal text-muted-foreground">
            <span>{type[0]}</span>

            <span>·</span>

            <span>Target {date}</span>
          </div>
        </CardTitle>

        <CardAction className="shrink-0">
          <Button variant="destructive" size="icon" aria-label="Delete goal">
            <Trash className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">$0.00</p>

            <p className="shrink-0 font-medium">${target.toFixed(2)} target</p>
          </div>

          <Progress
            aria-label="Goal progress"
            value={target}
            className="w-full"
          />
        </div>

        {/* Goal Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Documented income</CardDescription>

            <p className="mt-1 text-lg font-semibold">$0.00</p>
          </div>

          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Necessary expenses</CardDescription>

            <p className="mt-1 text-lg font-semibold">$0.00</p>
          </div>

          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Available to contribute</CardDescription>

            <p className="mt-1 text-lg font-semibold">$0.00</p>
          </div>

          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Remaining target</CardDescription>

            <p className="mt-1 text-lg font-semibold">${target.toFixed(2)}</p>
          </div>
        </div>

        {/* Entry Form */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Entry Type */}
          <Field className="min-w-0">
            <FieldLabel htmlFor="entry-type">Entry type</FieldLabel>

            <Select
              placeholder="Select Type"
              id="entry-type"
              className="w-full"
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  <SelectItem>Income Available for Goal</SelectItem>

                  <SelectItem>Necessary Expense</SelectItem>

                  <SelectItem>Contribution / Debt Payment</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {/* Date */}
          <Field className="min-w-0">
            <FieldLabel>Date</FieldLabel>

            <DatePickerInput className="w-full" />
          </Field>

          {/* Note */}
          <Field className="min-w-0">
            <FieldLabel>Note</FieldLabel>

            <Input
              type="text"
              placeholder="Paycheck, rent, transfer..."
              className="w-full"
            />
          </Field>

          {/* Amount */}
          <Field className="min-w-0">
            <FieldLabel>Amount</FieldLabel>

            <Input type="number" placeholder="0.00" className="w-full" />
          </Field>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button className="w-full sm:w-auto">Create Goal</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalCard;
