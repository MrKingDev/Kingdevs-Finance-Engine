// Only loaded into state by the explicitly enabled demo build. Goals remain frontend-only.
export const DEMO_GOALS = [
  { id: -1, name: "Emergency fund", type: "Savings" as const, targetAmount: 10000,
    contributed: 6800, documentedIncome: 5920, necessaryExpenses: 3400 },
  { id: -2, name: "Japan adventure", type: "Savings" as const, targetAmount: 4500,
    contributed: 1825, documentedIncome: 5920, necessaryExpenses: 3400 },
  { id: -3, name: "Student loan freedom", type: "Debt Payoff" as const, targetAmount: 8000,
    contributed: 5600, documentedIncome: 5920, necessaryExpenses: 3400 },
];
