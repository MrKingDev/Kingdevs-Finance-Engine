import PageTransition from "@/components/pageTransitions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import BudgetCard from "@/components/budgets/budgetCard";

const Budgets = () => {
  return (
    <PageTransition>
      <div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">
              Give every category a little room to breathe.
            </p>
          </div>
          <div className="flex sm:w-auto">
            <Button aria-label="Add Budget">
              <Plus />
              Add Budget
            </Button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BudgetCard />
          <BudgetCard />
          <BudgetCard />
          <BudgetCard />
          <BudgetCard />
        </section>
      </div>
    </PageTransition>
  );
};

export default Budgets;
