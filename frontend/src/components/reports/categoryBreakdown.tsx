import transactionData from "@/data/transactionData.json";
import { Separator } from "@/components/ui/separator";

const CategoryBreakdown = () => {
  const categoryTotals = transactionData.reduce((acc, transaction) => {
    if (transaction.type === "Income") return acc;

    const key = transaction.category;
    acc[key] = (acc[key] ?? 0) + transaction.amount;

    return acc;
  }, {});

  const categories = Object.entries(categoryTotals).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <>
      {categories.map(([category, total], index) => (
        <div key={category}>
          <div className="flex items-center justify-between py-4">
            <p className="font-semibold">{category}</p>

            <p className="shrink-0 font-semibold">
              $
              {total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {index !== categories.length - 1 && <Separator />}
        </div>
      ))}
    </>
  );
};

export default CategoryBreakdown;
