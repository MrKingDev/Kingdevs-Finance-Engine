import { API_URL, apiError } from "@/lib/finance-api";

export type Goal = {
  id: number;
  name: string;
  type: "Savings" | "Debt Payoff";
  targetAmount: number;
  targetDate: string | null;
  contributed: number;
  documentedIncome: number;
  necessaryExpenses: number;
};

type GoalResponse = {
  id: number;
  name: string;
  type: Goal["type"];
  target_amount: string;
  target_date: string | null;
  contributed: string;
  documented_income: string;
  necessary_expenses: string;
};

export type GoalEntryInput = {
  type: "income" | "expense" | "contribution";
  date: string;
  note: string;
  amount: string;
};

function toGoal(data: GoalResponse): Goal {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    targetAmount: Number(data.target_amount),
    targetDate: data.target_date,
    contributed: Number(data.contributed),
    documentedIncome: Number(data.documented_income),
    necessaryExpenses: Number(data.necessary_expenses),
  };
}

async function request(path: string, fallback: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}/goals${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) throw new Error(await apiError(response, fallback));
  return response;
}

export async function loadGoals(signal: AbortSignal): Promise<Goal[]> {
  const response = await request("", "Unable to load goals.", { signal });
  const data: GoalResponse[] = await response.json();
  return data.map(toGoal);
}

export async function createGoal(data: {
  name: string;
  type: Goal["type"];
  target_amount: string;
  target_date: string | null;
}): Promise<Goal> {
  const response = await request("", "Unable to create goal.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return toGoal(await response.json());
}

export async function addGoalEntry(
  id: number,
  data: GoalEntryInput,
): Promise<Goal> {
  const response = await request(`/${id}/entries`, "Unable to save entry.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return toGoal(await response.json());
}

export async function deleteGoal(id: number): Promise<void> {
  await request(`/${id}`, "Unable to delete goal.", { method: "DELETE" });
}
