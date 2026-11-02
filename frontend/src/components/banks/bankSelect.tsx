"use client";

import { useState } from "react";
import BankBadge from "@/components/banks/bankBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBanks } from "./bankProvider";

export default function BankSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const banks = useBanks();
  const [custom, setCustom] = useState(false);
  const names = new Map<string, string>();
  for (const name of [
    ...banks.data.map((bank) => bank.name),
    ...(value ? [value] : []),
  ]) {
    if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  const options = [...names.values()].sort((a, b) => a.localeCompare(b));
  const selected = names.get(value.toLowerCase());
  return (
    <div className="space-y-2">
      <Select
        aria-label="Bank"
        className="w-full"
        placeholder="Select a bank"
        selectedKey={custom ? "custom" : selected ? `bank:${selected}` : null}
        isDisabled={disabled}
        isRequired
        onSelectionChange={(key) => {
          if (key === null) return;
          setCustom(key === "custom");
          onChange(key === "custom" ? "" : String(key).slice(5));
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((name) => (
            <SelectItem key={name} id={`bank:${name}`} textValue={name}>
              <BankBadge bank={name} />
            </SelectItem>
          ))}
          <SelectItem id="custom">Other bank...</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input
          aria-label="Other bank name"
          placeholder="Enter bank name"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={100}
          required
          disabled={disabled}
        />
      )}
      {banks.error && (
        <p role="alert" className="text-xs text-destructive">
          Saved banks could not be loaded.{" "}
          <button type="button" className="underline" onClick={banks.refresh}>
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
