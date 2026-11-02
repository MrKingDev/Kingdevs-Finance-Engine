"use client";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";

import { Plus, Trash } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addGoalEntry, type Goal, type GoalEntryInput } from "@/lib/goals-api";

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (goal: Goal) => void;
}

const GoalCard = ({ goal, onDelete, onUpdate }: GoalCardProps) => {
  const { formatCurrency, formatDate, today } = useRegionalFormat();
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryType, setEntryType] =
    useState<GoalEntryInput["type"]>("contribution");
  const [chosenEntryDate, setEntryDate] = useState<string | null>(null);
  const entryDate = chosenEntryDate ?? today();
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    setEntryError(null);
    if (
      !entryDate ||
      !amount ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setEntryError("Choose a date and enter an amount greater than zero.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await addGoalEntry(goal.id, {
        type: entryType,
        date: entryDate,
        note,
        amount,
      });
      onUpdate(saved);
      setEntryOpen(false);
      setEntryType("contribution");
      setEntryDate(null);
      setNote("");
      setAmount("");
      toast.success("Entry saved");
    } catch (error) {
      setEntryError(
        error instanceof Error ? error.message : "Unable to save entry.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(goal.id);
      setDeleteOpen(false);
      toast.success("Goal deleted");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete goal.",
      );
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };
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
    ? formatDate(goal.targetDate)
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
          <AlertDialogTrigger
            isOpen={deleteOpen}
            onOpenChange={(open) => {
              if (!deletingRef.current) {
                setDeleteOpen(open);
                setDeleteError(null);
              }
            }}
          >
            <Button
              variant="destructive"
              size="icon"
              aria-label={`Delete ${goal.name}`}
            >
              <Trash className="size-4" />
            </Button>
            <AlertDialog isKeyboardDismissDisabled={deleting}>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{" "}
                  {goal.name} and its entries.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p role="alert" className="text-sm text-destructive">
                  {deleteError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel isDisabled={deleting}>
                  Never Mind
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  isDisabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
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
              {formatCurrency(goal.contributed)}
            </p>

            <p className="shrink-0 font-medium">
              {formatCurrency(goal.targetAmount)} target
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
              {formatCurrency(goal.documentedIncome)}
            </p>
          </div>

          {/* Necessary Expenses */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Necessary expenses</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(goal.necessaryExpenses)}
            </p>
          </div>

          {/* Available To Contribute */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Available to contribute</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(availableToContribute)}
            </p>
          </div>

          {/* Remaining Target */}
          <div className="min-w-0 rounded-md bg-muted px-4 py-3">
            <CardDescription>Remaining target</CardDescription>

            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(remainingTarget)}
            </p>
          </div>
        </div>

        <DialogTrigger
          isOpen={entryOpen}
          onOpenChange={(open) => {
            if (!savingRef.current) {
              setEntryOpen(open);
              setEntryError(null);
            }
          }}
        >
          <Button className="w-full">
            {" "}
            <Plus />
            Add Entry
          </Button>
          <Dialog
            isDismissable={!saving}
            isKeyboardDismissDisabled={saving}
            showCloseButton={!saving}
          >
            <DialogHeader>
              <DialogTitle>Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddEntry}>
              <fieldset disabled={saving}>
                <Field className="min-w-0">
                  <FieldLabel>Entry Type</FieldLabel>

                  <Select
                    aria-label="Entry Type"
                    value={entryType}
                    onChange={(value) => {
                      if (
                        value === "income" ||
                        value === "expense" ||
                        value === "contribution"
                      )
                        setEntryType(value);
                    }}
                  >
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
                  <FieldLabel htmlFor={`entry-date-${goal.id}-input`}>
                    Date
                  </FieldLabel>

                  <DatePickerInput
                    id={`entry-date-${goal.id}`}
                    className="w-full"
                    value={entryDate}
                    onChange={setEntryDate}
                  />
                </Field>

                {/* Note */}
                <Field className="min-w-0 mt-2">
                  <FieldLabel htmlFor={`entry-note-${goal.id}`}>
                    Note
                  </FieldLabel>

                  <Input
                    id={`entry-note-${goal.id}`}
                    type="text"
                    maxLength={500}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Paycheck, rent, transfer..."
                    className="w-full"
                  />
                </Field>

                {/* Amount */}
                <Field className="min-w-0 mt-2">
                  <FieldLabel htmlFor={`entry-amount-${goal.id}`}>
                    Amount
                  </FieldLabel>

                  <Input
                    id={`entry-amount-${goal.id}`}
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                </Field>
                {entryError && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {entryError}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full mt-4"
                  isDisabled={saving}
                >
                  <Plus />
                  {saving ? "Saving..." : "Add Entry"}
                </Button>
              </fieldset>
            </form>
          </Dialog>
        </DialogTrigger>
      </CardContent>
    </Card>
  );
};

export default GoalCard;
