"use client";

import { useState } from "react";

import PageTransition from "@/components/pageTransitions";
import GoalCard from "@/components/goal/goalCard";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker";

import { Plus } from "lucide-react";

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

const Goals = () => {
  // --------------------------------
  // Goals
  // --------------------------------

  const [goals, setGoals] = useState<Goal[]>([]);

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

  const handleCreateGoal = () => {
    if (!goalName.trim()) {
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      return;
    }

    const newGoal: Goal = {
      id: Date.now(),
      name: goalName.trim(),
      type: goalType,
      targetAmount: Number(targetAmount),
      targetDate: targetDate || undefined,
      contributed: 0,
      documentedIncome: 0,
      necessaryExpenses: 0,
    };

    setGoals((currentGoals) => [...currentGoals, newGoal]);

    // Reset form
    setGoalName("");
    setGoalType("Savings");
    setTargetAmount("");
    setTargetDate("");
  };

  // --------------------------------
  // Delete Goal
  // --------------------------------

  const handleDeleteGoal = (id: number) => {
    setGoals((currentGoals) => currentGoals.filter((goal) => goal.id !== id));
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
          <DialogTrigger>
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" />
              Create Goal
            </Button>

            <Dialog>
              <DialogHeader>
                <DialogTitle>Create A Goal</DialogTitle>
              </DialogHeader>

              <div>
                {/* Goal Name */}
                <Field className="min-w-0">
                  <FieldLabel htmlFor="goal-name">Goal Name</FieldLabel>

                  <Input
                    id="goal-name"
                    type="text"
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
                  <FieldLabel htmlFor="target-amount">Target Amount</FieldLabel>

                  <Input
                    id="target-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full"
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                  />
                </Field>

                {/* Target Date */}
                <Field className="mt-2 min-w-0">
                  <FieldLabel htmlFor="target-date">
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
                <Button className="mt-4 w-full" onClick={handleCreateGoal}>
                  Create Goal
                </Button>
              </div>
            </Dialog>
          </DialogTrigger>
        </header>

        {/* Goals */}
        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
          ))}
        </section>

        {/* Empty State */}
        {goals.length === 0 && (
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
