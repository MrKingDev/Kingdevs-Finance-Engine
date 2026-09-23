import PageTransition from "@/components/pageTransitions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

import { DatePickerInput } from "@/components/ui/date-picker";

import GoalCard from "@/components/goal/goalCard";

const Goals = () => {
  return (
    <PageTransition>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">
            Plan a savings target or debt payoff. Document income and necessary
            expenses, then record what you put toward the goal.
          </p>
        </div>
      </header>

      <section className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Create a goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Goal Name */}
              <Field>
                <FieldLabel htmlFor="goal-name">Goal Name</FieldLabel>
                <Input
                  id="goal-name"
                  type="text"
                  placeholder="Emergency Fund"
                  className="w-full"
                />
              </Field>

              {/* Goal Type */}
              <Field>
                <FieldLabel htmlFor="goal-type">Goal Type</FieldLabel>

                <Select
                  placeholder="Pick a Type"
                  id="goal-type"
                  className="w-full"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectGroup>
                      <SelectItem>Savings</SelectItem>
                      <SelectItem>Debt Payoff</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {/* Target Amount */}
              <Field>
                <FieldLabel htmlFor="target-amount">Target Amount</FieldLabel>
                <Input
                  id="target-amount"
                  type="number"
                  placeholder="$0.00"
                  className="w-full"
                />
              </Field>

              {/* Target Date */}
              <Field>
                <FieldLabel htmlFor="target-date">
                  Target Date (optional)
                </FieldLabel>
                <DatePickerInput id="target-date" className="w-full" />
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="w-full">Create Goal</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <GoalCard />
        <GoalCard />
        <GoalCard />
        <GoalCard />
      </section>
    </PageTransition>
  );
};

export default Goals;
