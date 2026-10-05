"use client";

import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Category } from "@/types/api";

type CategorySelectProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  allowAll?: boolean;
  required?: boolean;
  label?: string;
};

export default function CategorySelect({
  value,
  onChange,
  allowAll = false,
  required = false,
  label = "Category",
}: CategorySelectProps) {
  const {
    data: categories,
    loading,
    error,
    refresh,
  } = useFinanceList<Category>("/categories");
  const selectedKey = value ? `category:${value}` : allowAll ? "all" : null;
  return (
    <div className="min-w-0 space-y-2">
      <Select
        aria-label={label}
        className="w-full"
        selectedKey={selectedKey}
        placeholder={loading ? "Loading categories..." : "Select a category"}
        isRequired={required}
        isDisabled={loading || !!error || (!allowAll && !categories.length)}
        onSelectionChange={(key) => {
          if (key !== null)
            onChange(
              key === "all" ? null : String(key).slice("category:".length),
            );
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem id="all">All categories</SelectItem>}
          {categories.map((category) => (
            <SelectItem
              key={category.name}
              id={`category:${category.name}`}
              textValue={category.name}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--${category.color})` }}
                />
                {category.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}{" "}
          <button type="button" className="underline" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {!loading && !error && !categories.length && (
        <p className="text-xs text-muted-foreground">
          No saved categories yet.
        </p>
      )}
      {!allowAll && (
        <Link
          href="/settings#categories"
          className="text-xs underline underline-offset-4"
        >
          Create categories in Settings
        </Link>
      )}
    </div>
  );
}
