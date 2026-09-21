import PageTransition from "@/components/pageTransitions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Dashboard = () => {
  const today = new Date();

  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  return (
    <PageTransition>
      <main className="flex flex-col gap-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              A clear picture of your money for {currentMonth}/{currentYear}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Month */}
            <Select
              placeholder="Month"
              aria-label="Month"
              defaultValue={currentMonth}
            >
              <SelectTrigger
                aria-label="Month"
                className="w-full min-w-0 sm:w-45"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (month) => (
                      <SelectItem key={month} value={month}>
                        {new Intl.DateTimeFormat("en-US", {
                          month: "long",
                        }).format(new Date(2000, month - 1))}
                      </SelectItem>
                    ),
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Year */}
            <Select
              placeholder="Year"
              aria-label="Year"
              defaultValue={currentYear}
            >
              <SelectTrigger
                aria-label="Year"
                className="w-full min-w-0 sm:w-45"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 101 }, (_, index) => 2000 + index).map(
                    (year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ),
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button aria-label="Add Transaction">
              <Plus />
              Add Transaction
            </Button>
          </div>
        </header>
      </main>
    </PageTransition>
  );
};

export default Dashboard;
