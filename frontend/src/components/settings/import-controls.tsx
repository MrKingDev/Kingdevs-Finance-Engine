"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ImportOption = { value: string; label: string; color?: string };
export const transactionTypes: ImportOption[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

// Use the project's shadcn/React Aria controls; category options are supplied
// by the parent so preview rows do not each fetch the category list.
export function ImportSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  showLabel = false,
  placeholder = "Choose…",
  emptyLabel,
}: {
  label: string;
  value: string | null;
  options: ImportOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  showLabel?: boolean;
  placeholder?: string;
  emptyLabel?: string;
}) {
  return (
    <Select
      aria-label={label}
      className="w-full min-w-32 space-y-2"
      selectedKey={
        value === null ? (emptyLabel ? "none" : null) : `value:${value}`
      }
      isDisabled={disabled}
      placeholder={placeholder}
      onSelectionChange={(key) => {
        if (key !== null)
          onChange(key === "none" ? null : String(key).slice(6));
      }}
    >
      {showLabel && <Label>{label}</Label>}
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel && <SelectItem id="none">{emptyLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem
            key={option.value}
            id={`value:${option.value}`}
            textValue={option.label}
          >
            {option.color && (
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--${option.color})` }}
              />
            )}
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
