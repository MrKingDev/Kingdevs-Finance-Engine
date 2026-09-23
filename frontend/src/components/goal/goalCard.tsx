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
    <div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="space-y-1">
            <span className="text-lg font-semibold">Goal Title</span>

            <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <span>{type[0]}</span>
              <span>·</span>
              <span>Target {date}</span>
            </div>
          </CardTitle>

          <CardAction>
            <Button
              variant="destructive"
              size="icon"
              aria-label="Delete budget"
            >
              <Trash className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">$0.00</p>
              <p className="font-medium">${target} target</p>
            </div>

            <Progress
              aria-label="Budget progress"
              value={target}
              className="w-full"
            />
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted px-4 py-2 rounded-md">
              <CardDescription>Documented income</CardDescription>
              <CardTitle>$0.00</CardTitle>
            </div>
            <div className="bg-muted  px-4 py-2 rounded-md">
              <CardDescription>Necessary expenses</CardDescription>
              <CardTitle>$0.00</CardTitle>
            </div>
            <div className="bg-muted  px-4 py-2 rounded-md">
              <CardDescription>Available to contribute</CardDescription>
              <CardTitle>$0.00</CardTitle>
            </div>
            <div className="bg-muted  px-4 py-2 rounded-md">
              <CardDescription>Remaining target</CardDescription>
              <CardTitle>${target}</CardTitle>
            </div>
          </div>

          {/*  */}
          <div className="grid grid-cols-2 gap-4">
            {/* Entry Type */}
            <Field>
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

            <Field>
              <FieldLabel>Date</FieldLabel>
              <DatePickerInput />
            </Field>

            <Field>
              <FieldLabel>Note</FieldLabel>
              <Input type="text" placeholder="Paycheck, Rent, transfer..." />
            </Field>

            <Field>
              <FieldLabel>Amount</FieldLabel>
              <Input type="number" placeholder="Paycheck, Rent, transfer..." />
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="w-full">Create Goal</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalCard;
