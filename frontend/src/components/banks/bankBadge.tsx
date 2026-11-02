"use client";
import { Badge } from "@/components/ui/badge";
import { bankColor, bankTextColor } from "@/lib/banks";
import { useBanks } from "./bankProvider";

export default function BankBadge({ bank }: { bank: string }) {
  const { data } = useBanks();
  const color = data.find((item) => item.name.trim().toLowerCase() === bank.trim().toLowerCase())?.color ?? bankColor(bank);
  return <Badge style={{ backgroundColor: color, color: bankTextColor(color) }}>{bank}</Badge>;
}
