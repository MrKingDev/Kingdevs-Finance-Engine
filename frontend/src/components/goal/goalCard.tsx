"use client";

import { Trash, Plus } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";

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

export type Goal = {
  id: number;
  name: string;
  type: "Savings" | "Debt Payoff";
  targetAmount: number;
  targetDate?: string;
  contributed: number;
  documentedIncome: number;
  necessaryExpenses: number;
};

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: number) => void;
}

const GoalCard = ({ goal, onDelete }: GoalCardProps) => {
  // -----------------------------
  // Calculations
  // -----------------------------

  const progress =
    goal.targetAmount > 0
      ? Math.min((goal.contributed / goal.targetAmount) * 100, 100)
      : 0;

  const availableToContribute = Math.max(
    goal.documentedIncome - goal.necessaryExpenses,
    0,
  );

  const remainingTarget = Math.max(goal.targetAmount - goal.contributed, 0);

  // -----------------------------
  // Format Target Date
  // -----------------------------

  const formattedTargetDate = goal.targetDate
    ? new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card className="h-full w-full">
      {/* Header */}
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="min-w-0 space-y-1">
          {/* Goal Name */}
          <p className="truncate text-lg font-semibold">{goal.name}</p>

          {/* Goal Type / Date */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-normal text-muted-foreground">
            <span>{goal.type}</span>

            {formattedTargetDate && (
              <>
                <span>·</span>

                <span>Target {formattedTargetDate}</span>
              </>
            )}
          </div>
        </CardTitle>

        {/* Delete Goal */}
        <CardAction className="shrink-0">
          <AlertDialogTrigger>
            <Button variant="destructive" size="icon">
              <Trash className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  {goal.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    onDelete(goal.id);
                    toast("Goal has been deleted", {
                      position: "bottom-right",
                    });
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialog>
          </AlertDialogTrigger>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">
              ${goal.contributed.toFixed(2)}
            </p>

            <p className="shrink-0 font-medium">
              ${goal.targetAmount.toFixed(2)} target
            </p>
          </div>

          <Progress
            aria-label={`${goal.name} progress`}
            value={progress}
            className="w-full"
          />
        </div>

        {/* Goal Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Documented Income */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Documented income</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              ${goal.documentedIncome.toFixed(2)}
            </p>
          </div>

          {/* Necessary Expenses */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Necessary expenses</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              ${goal.necessaryExpenses.toFixed(2)}
            </p>
          </div>

          {/* Available To Contribute */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Available to contribute</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              ${availableToContribute.toFixed(2)}
            </p>
          </div>

          {/* Remaining Target */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Remaining target</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              ${remainingTarget.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogTrigger>
          <Button className="w-full">
            {" "}
            <Plus />
            Add Entry
          </Button>
          <Dialog>
            <DialogHeader>
              <DialogTitle>Entry</DialogTitle>
            </DialogHeader>
            <div>
              <Field className="min-w-0">
                <FieldLabel>Entry Type</FieldLabel>

                <Select placeholder="Select Type">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem id="income">
                        Income Available for Goal
                      </SelectItem>

                      <SelectItem id="expense">Necessary Expense</SelectItem>

                      <SelectItem id="contribution">
                        Contribution / Debt Payment
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {/* Date */}
              <Field className="min-w-0 mt-2">
                <FieldLabel>Date</FieldLabel>

                <DatePickerInput className="w-full" />
              </Field>

              {/* Note */}
              <Field className="min-w-0 mt-2">
                <FieldLabel>Note</FieldLabel>

                <Input
                  type="text"
                  placeholder="Paycheck, rent, transfer..."
                  className="w-full"
                />
              </Field>

              {/* Amount */}
              <Field className="min-w-0 mt-2">
                <FieldLabel>Amount</FieldLabel>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full"
                />
              </Field>
              <Button className="w-full mt-4">
                <Plus />
                Add Entry
              </Button>
            </div>
          </Dialog>
        </DialogTrigger>
      </CardContent>
    </Card>
  );
};

export default GoalCard;
