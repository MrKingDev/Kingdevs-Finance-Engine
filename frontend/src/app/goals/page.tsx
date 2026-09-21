import PageTransition from "@/components/pageTransitions";

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
    </PageTransition>
  );
};

export default Goals;
