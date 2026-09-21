import PageTransition from "@/components/pageTransitions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
      </div>
    </PageTransition>
  );
};

export default Transactions;
