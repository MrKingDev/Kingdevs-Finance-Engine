"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useFinanceList } from "@/lib/use-finance-list";

type BankStyle = { name: string; color: string | null; transaction_count: number };
const BankContext = createContext<{ data: BankStyle[]; loading: boolean; error: string | null; refresh: () => void }>({ data: [], loading: true, error: null, refresh: () => {} });
export function BankProvider({ children }: { children: ReactNode }) {
  const banks = useFinanceList<BankStyle>("/banks");
  return <BankContext.Provider value={banks}>{children}</BankContext.Provider>;
}
export const useBanks = () => useContext(BankContext);
