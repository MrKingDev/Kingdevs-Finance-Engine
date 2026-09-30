import PageTransition from "@/components/pageTransitions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaycheckSplitter from "@/components/tools/paycheck-splitter";
import SalaryConverter from "@/components/tools/salary-converter";
import BillSplitter from "@/components/tools/tip-calculator";
import CompoundInsert from "@/components/tools/compound-interest";
import TripBudget from "@/components/tools/trip-budget";
import WishList from "@/components/tools/wish-list";
import Subscriptions from "@/components/tools/subscriptions";

// Styling
const tabTriggerStyles = `
  relative
  shrink-0
  whitespace-nowrap
  rounded-none
  border-b-2
  border-transparent
  bg-transparent
  px-4
  py-3
  text-sm
  font-medium
  text-muted-foreground
  shadow-none
  transition-all
  duration-200

  hover:text-foreground

  data-[selected]:border-primary
  data-[selected]:text-foreground
  data-[selected]:bg-transparent
`;

const tabContentStyles = `
  mt-6
  animate-in
  fade-in-0
  slide-in-from-bottom-2
  duration-300
`;

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

      <section className="mt-4">
        <Tabs defaultSelectedKey="sub">
          <TabsList className="w-full">
            <TabsTrigger id="sub">Subscription Checker</TabsTrigger>
            <TabsTrigger id="paycheck">Paycheck Splitter</TabsTrigger>
            <TabsTrigger id="salary">Salary Converter</TabsTrigger>
            <TabsTrigger id="bill">Bill Splitter</TabsTrigger>
            <TabsTrigger id="interest">Compound Interest</TabsTrigger>
            <TabsTrigger id="trip">Trip Budget</TabsTrigger>
            <TabsTrigger id="wish">Wish List</TabsTrigger>
          </TabsList>
          <TabsContent id="sub">
            <Subscriptions />
          </TabsContent>
          <TabsContent id="paycheck">
            <PaycheckSplitter />
          </TabsContent>
          <TabsContent id="salary">
            <SalaryConverter />
          </TabsContent>
          <TabsContent id="bill">
            <BillSplitter />
          </TabsContent>
          <TabsContent id="interest">
            <CompoundInsert />
          </TabsContent>
          <TabsContent id="trip">
            <TripBudget />
          </TabsContent>
          <TabsContent id="wish">
            <WishList />
          </TabsContent>
        </Tabs>
      </section>
    </PageTransition>
  );
};

export default Tools;
