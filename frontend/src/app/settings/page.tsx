import PageTransition from "@/components/pageTransitions";

const Settings = () => {
  return (
    <PageTransition>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Organize categories, import statements, automate sorting, and choose
            how your money is displayed.
          </p>
        </div>
      </header>

      <section>
        <div>Nav</div>
      </section>
    </PageTransition>
  );
};

export default Settings;
