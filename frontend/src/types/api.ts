export type Category = { name: string };

export type Budget = {
  id: number;
  month: number;
  year: number;
  category: string | null;
  budget: string;
  spent: string;
  remaining: string;
  usage_percentage: number;
};

export type Transaction = {
  id: number;
  date: string;
  merchant: string;
  category: string;
  bank: string;
  type: "income" | "expense";
  amount: string;
  "pie-color": string;
};
