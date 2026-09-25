import transactionData from "@/data/transactionData.json";
import { Separator } from "@/components/ui/separator";

const MonthlyHistory = () => {
  const monthlyTotals = transactionData.reduce((acc, transaction) => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount =
      transaction.type === "Income" ? transaction.amount : -transaction.amount;

    if (!acc[key]) {
      acc[key] = { date, total: 0 };
    }
    acc[key].total += amount;

    return acc;
  }, {});

  const recentMonths = Object.values(monthlyTotals)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6)
    .reverse();

  return (
    <>
      {recentMonths.map((month, index) => {
        const label = month.date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        return (
          <div key={label}>
            <div className="flex items-center justify-between py-4">
              <p className="font-semibold">{label}</p>

              <p className="shrink-0 font-semibold">
                $
                {month.total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {index !== recentMonths.length - 1 && <Separator />}
          </div>
        );
      })}
    </>
  );
};

export default MonthlyHistory;
