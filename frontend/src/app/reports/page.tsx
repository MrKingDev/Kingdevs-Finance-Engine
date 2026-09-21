import PageTransition from "@/components/pageTransitions";

const Reports = () => {
  return (
    <PageTransition>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Understand where your money comes from and where it goes.
          </p>
        </div>
      </header>
    </PageTransition>
  );
};

export default Reports;
