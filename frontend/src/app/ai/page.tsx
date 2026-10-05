import PageTransition from "@/components/pageTransitions";
import { Button } from "@/components/ui/button";
const AI = () => {
  return (
    <PageTransition>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI assistant</h1>
          <p className="text-muted-foreground">
            Configure and use your local AI assistant from one place.
          </p>
        </div>
      </header>

      <section>
        <h2 className="mt-4 text-2xl font-semibold">Coming soon...</h2>
      </section>
    </PageTransition>
  );
};

export default AI;
