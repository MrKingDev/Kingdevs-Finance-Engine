import transactionData from "@/data/transactionData.json";
import { Separator } from "@/components/ui/separator";

const RecentTransactions = () => {
  const recentTransactions = [...transactionData]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  return (
    <>
      {recentTransactions.map((transaction, index) => {
        const isIncome = transaction.type === "Income";
        return (
          <div key={transaction.id}>
            <div className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{transaction.merchant}</p>

                <p className="truncate text-sm text-muted-foreground">
                  {transaction.category}
                  <span className="mx-1">•</span>

                  {transaction.bank}
                  <span className="mx-1">•</span>

                  {transaction.date}
                </p>
              </div>

              <p
                className={`shrink-0 font-semibold ${
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {isIncome ? "+" : "-"}${transaction.amount.toFixed(2)}
              </p>
            </div>

            {index !== recentTransactions.length - 1 && <Separator />}
          </div>
        );
      })}
    </>
  );
};

export default RecentTransactions;
