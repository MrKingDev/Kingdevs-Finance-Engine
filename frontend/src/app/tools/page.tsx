import PageTransition from "@/components/pageTransitions";

const Tools = () => {
  return (
    <PageTransition>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tools</h1>
          <p className="text-muted-foreground">
            Use tools to manage your spending
          </p>
        </div>
      </header>

      <section className="mt-4"></section>
    </PageTransition>
  );
};

export default Tools;
