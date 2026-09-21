import PageTransition from "@/components/pageTransitions";

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
        Dashboard
        <div className="flex gap-2">
          {/* Month */}
          <Select
            aria-label="Month"
            placeholder="Month"
            defaultValue={currentMonth}
          >
            <SelectTrigger className="w-45">
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
            aria-label="Year"
            placeholder="Year"
            defaultValue={currentYear}
          >
            <SelectTrigger className="w-45">
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
        </div>
      </main>
    </PageTransition>
  );
};

export default Dashboard;
