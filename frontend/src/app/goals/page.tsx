"use client";

import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import GoalCard from "@/components/goal/goalCard";
import PageTransition from "@/components/pageTransitions";

import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGoal, deleteGoal, type Goal, loadGoals } from "@/lib/goals-api";

const Goals = () => {
  // --------------------------------
  // Goals
  // --------------------------------

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    void revision;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    loadGoals(controller.signal)
      .then((saved) => {
        if (!controller.signal.aborted) setGoals(saved);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load goals.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  // --------------------------------
  // Create Goal Form
  // --------------------------------

  const [goalName, setGoalName] = useState("");

  const [goalType, setGoalType] = useState<"Savings" | "Debt Payoff">(
    "Savings",
  );

  const [targetAmount, setTargetAmount] = useState("");

  const [targetDate, setTargetDate] = useState("");

  // --------------------------------
  // Create Goal
  // --------------------------------

  const handleCreateGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    setFormError(null);
    if (!goalName.trim()) {
      setFormError("Enter a goal name.");
      return;
    }

    if (
      !targetAmount ||
      !Number.isFinite(Number(targetAmount)) ||
      Number(targetAmount) <= 0
    ) {
      setFormError("Enter a target amount greater than zero.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await createGoal({
        name: goalName.trim(),
        type: goalType,
        target_amount: targetAmount,
        target_date: targetDate || null,
      });
      setGoals((currentGoals) => [...currentGoals, saved]);
      setIsOpen(false);
      setGoalName("");
      setGoalType("Savings");
      setTargetAmount("");
      setTargetDate("");
      toast.success("Goal created");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create goal.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // --------------------------------
  // Delete Goal
  // --------------------------------

  const handleDeleteGoal = async (id: number) => {
    await deleteGoal(id);
    setGoals((currentGoals) => currentGoals.filter((goal) => goal.id !== id));
  };

  const handleGoalUpdated = (saved: Goal) => {
    setGoals((current) =>
      current.map((goal) => (goal.id === saved.id ? saved : goal)),
    );
  };

  return (
    <PageTransition>
      <div className="w-full min-w-0">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Goals</h1>

            <p className="max-w-3xl text-muted-foreground">
              Plan a savings target or debt payoff. Document income and
              necessary expenses, then record what you put toward the goal.
            </p>
          </div>

          {/* Create Goal Dialog */}
          <DialogTrigger
            isOpen={isOpen}
            onOpenChange={(open) => {
              if (!savingRef.current) {
                setIsOpen(open);
                setFormError(null);
              }
            }}
          >
            <Button
              className="w-full sm:w-auto"
              isDisabled={loading || !!loadError}
            >
              <Plus className="size-4" />
              Create Goal
            </Button>

            <Dialog
              isDismissable={!saving}
              isKeyboardDismissDisabled={saving}
              showCloseButton={!saving}
            >
              <DialogHeader>
                <DialogTitle>Create A Goal</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateGoal}>
                <fieldset disabled={saving}>
                  {/* Goal Name */}
                  <Field className="min-w-0">
                    <FieldLabel htmlFor="goal-name">Goal Name</FieldLabel>

                    <Input
                      id="goal-name"
                      type="text"
                      required
                      maxLength={120}
                      placeholder="Emergency Fund"
                      className="w-full"
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                    />
                  </Field>

                  {/* Goal Type */}
                  <Field className="mt-2 min-w-0">
                    <FieldLabel>Goal Type</FieldLabel>

                    <Select
                      aria-label="Goal Type"
                      placeholder="Pick a Type"
                      value={goalType}
                      onChange={(value) => {
                        if (value === "Savings" || value === "Debt Payoff") {
                          setGoalType(value);
                        }
                      }}
                    >
                      <SelectTrigger id="goal-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectGroup>
                          <SelectItem id="Savings">Savings</SelectItem>

                          <SelectItem id="Debt Payoff">Debt Payoff</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Target Amount */}
                  <Field className="mt-2 min-w-0">
                    <FieldLabel htmlFor="target-amount">
                      Target Amount
                    </FieldLabel>

                    <Input
                      id="target-amount"
                      type="number"
                      min="0.01"
                      max="9999999999.99"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full"
                      value={targetAmount}
                      onChange={(event) => setTargetAmount(event.target.value)}
                    />
                  </Field>

                  {/* Target Date */}
                  <Field className="mt-2 min-w-0">
                    <FieldLabel htmlFor="target-date-input">
                      Target Date (optional)
                    </FieldLabel>

                    <DatePickerInput
                      id="target-date"
                      className="w-full"
                      value={targetDate}
                      onChange={setTargetDate}
                    />
                  </Field>

                  {/* Submit */}
                  {formError && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                      {formError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="mt-4 w-full"
                    isDisabled={saving}
                  >
                    {saving ? "Creating..." : "Create Goal"}
                  </Button>
                </fieldset>
              </form>
            </Dialog>
          </DialogTrigger>
        </header>

        {/* Goals */}
        {loading && (
          <output className="mt-6 block text-muted-foreground">
            Loading goals...
          </output>
        )}
        {loadError && (
          <div role="alert" className="mt-6 space-y-2">
            <p className="text-destructive">{loadError}</p>
            <Button
              variant="outline"
              onClick={() => setRevision((value) => value + 1)}
            >
              Retry
            </Button>
          </div>
        )}
        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={handleDeleteGoal}
              onUpdate={handleGoalUpdated}
            />
          ))}
        </section>

        {/* Empty State */}
        {!loading && !loadError && goals.length === 0 && (
          <div className="mt-10 text-center text-muted-foreground">
            <p>No goals yet.</p>

            <p className="text-sm">Create your first goal to get started.</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Goals;
