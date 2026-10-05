"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Category, CategoryColorOption } from "@/types/api";

export default function CategoriesSettings() {
  const categories = useFinanceList<Category>("/categories");
  const palette = useFinanceList<CategoryColorOption>("/categories/colors");
  const [name, setName] = useState("");
  const [color, setColor] = useState("chart-blue-2");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!name.trim()) {
      setError("Enter a category name.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });
      if (!response.ok)
        throw new Error(await apiError(response, "Unable to create category."));
      const created: Category = await response.json();
      setName("");
      setMessage(
        `${created.name} is ready to use in transactions and budgets.`,
      );
      notifyFinanceChanged();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to create category.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeColor(category: Category, nextColor: string) {
    if (nextColor === category.color) return;
    setUpdating(category.name);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `${API_URL}/categories/${encodeURIComponent(category.name)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: nextColor }),
        },
      );
      if (!response.ok)
        throw new Error(await apiError(response, "Unable to update color."));
      setMessage(
        `${category.name} color updated, including existing transactions.`,
      );
      notifyFinanceChanged();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to update color.",
      );
    } finally {
      setUpdating(null);
    }
  }

  const loadError = categories.error || palette.error;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={createCategory} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="new-category-name" className="text-sm font-medium">
            Category name
          </label>
          <Input
            id="new-category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Groceries"
          />
        </div>
        <fieldset
          disabled={palette.loading || !!palette.error || saving}
          className="space-y-3"
        >
          <legend className="text-sm font-medium">Chart color</legend>
          <p className="text-xs text-muted-foreground">
            These colors use the same palette as your spending pie chart.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {palette.data.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="category-color"
                  value={option.value}
                  checked={color === option.value}
                  onChange={() => setColor(option.value)}
                  className="peer sr-only"
                />
                <span className="flex items-center gap-2 rounded-md border p-2 text-sm peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--${option.value})` }}
                  />
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {palette.loading && (
          <p className="text-sm text-muted-foreground">
            Loading chart colors...
          </p>
        )}
        <Button
          type="submit"
          isDisabled={
            saving || palette.loading || !!palette.error || !name.trim()
          }
        >
          {saving ? "Creating..." : "Create category"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <output className="block text-sm text-muted-foreground">
            {message}
          </output>
        )}
        {loadError && (
          <p role="alert" className="text-sm text-destructive">
            {loadError}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                categories.refresh();
                palette.refresh();
              }}
            >
              Retry
            </button>
          </p>
        )}
      </form>
      <div className="space-y-4">
        <h3 className="font-semibold">Saved categories</h3>
        <p className="text-sm text-muted-foreground">
          Choose these in transactions and budgets. Changing a color also
          recolors existing expenses in your charts.
        </p>
        {categories.loading && (
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        )}
        {!categories.loading &&
          !categories.error &&
          !categories.data.length && (
            <p className="text-sm text-muted-foreground">
              Create your first category to get started.
            </p>
          )}
        {categories.data.map((category) => (
          <div
            key={category.name}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="inline-flex min-w-0 items-center gap-2 font-medium">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--${category.color})` }}
              />
              <span className="break-all">{category.name}</span>
            </span>
            <Select
              aria-label={`Color for ${category.name}`}
              selectedKey={category.color}
              isDisabled={
                updating !== null || palette.loading || !!palette.error
              }
              onSelectionChange={(key) => {
                if (key !== null) void changeColor(category, String(key));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {palette.data.map((option) => (
                  <SelectItem key={option.value} id={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
