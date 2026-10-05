export type Category = { name: string; color: string };
export type CategoryColorOption = { value: string; label: string };

export type SubscriptionResponse = {
  id: number;
  name: string;
  amount: string;
  currency: "USD";
  billing_cycle: "monthly" | "annual";
  next_due_date: string;
  following_due_date: string;
  category: string | null;
  payment_method_label: string | null;
  icon: string | null;
  is_active: boolean;
  next_bill_status: "overdue" | "due_today" | "upcoming" | "archived";
  yearly_cost: string;
  last_paid_on: string | null;
  payment_count: number;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPayment = {
  id: number;
  subscription_id: number;
  due_date: string;
  paid_on: string;
  amount: string;
  created_at: string;
};

export type SubscriptionOverview = {
  items: SubscriptionResponse[];
  summary: {
    currency: "USD";
    as_of_date: string;
    active_count: number;
    overdue_count: number;
    due_today_count: number;
    upcoming_count: number;
    yearly_cost: string;
    monthly_average: string;
  };
};

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
