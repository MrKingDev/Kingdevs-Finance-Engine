"use client";

import { type FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";
import { useFinanceList } from "@/lib/use-finance-list";
import type { Category } from "@/types/api";
import { ImportSelect, transactionTypes } from "../import-controls";

type Rule = {
  id: number;
  match_text: string;
  type: "income" | "expense";
  category: string | null;
  enabled: boolean;
};

export default function ImportRules() {
  const rules = useFinanceList<Rule>("/rules");
  const categories = useFinanceList<Category>("/categories");
  const [match, setMatch] = useState("");
  const [type, setType] = useState<Rule["type"]>("expense");
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const categoryOptions = categories.data.map((item) => ({
    value: item.name,
    label: item.name,
    color: item.color,
  }));

  function resetForm() {
    setEditing(null);
    setMatch("");
    setType("expense");
    setCategory(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !match.trim()) return;
    const success = await mutate(
      editing ? `/${editing.id}` : "",
      editing ? "PUT" : "POST",
      { match_text: match, type, category, enabled: editing?.enabled ?? true },
    );
    if (success) resetForm();
  }

  async function mutate(path: string, method: string, body?: Omit<Rule, "id">) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/rules${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok)
        throw new Error(await apiError(response, "Unable to save rule."));
      setMessage("Rules updated. Preview your CSV again to apply them.");
      notifyFinanceChanged();
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to save rule.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        For example, “rent” becomes an expense and “salary” becomes income.
        Rules fill missing types and categories during CSV preview. Explicit
        bank debit/credit labels take precedence; you can correct any type in
        the preview.
      </p>
      <form onSubmit={save} className="space-y-3 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="rule-match">Description includes</FieldLabel>
            <Input
              id="rule-match"
              value={match}
              maxLength={100}
              required
              disabled={busy}
              placeholder="e.g. rent"
              onChange={(event) => setMatch(event.target.value)}
            />
          </Field>
          <ImportSelect
            label="Treat as"
            showLabel
            value={type}
            options={transactionTypes}
            disabled={busy}
            onChange={(value) => {
              if (value === "income" || value === "expense") setType(value);
            }}
          />
          <ImportSelect
            label="Category (optional)"
            showLabel
            value={category}
            options={categoryOptions}
            emptyLabel="Keep CSV category"
            disabled={busy || categories.loading || !!categories.error}
            onChange={setCategory}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" isDisabled={busy || !match.trim()}>
            {busy ? "Saving…" : editing ? "Save rule" : "Add rule"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              isDisabled={busy}
              onPress={resetForm}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
      {(error || rules.error || categories.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error || rules.error || categories.error}
          <Button
            type="button"
            variant="link"
            isDisabled={busy}
            onPress={() => {
              rules.refresh();
              categories.refresh();
            }}
          >
            Retry
          </Button>
        </p>
      )}
      {message && <output className="block text-sm">{message}</output>}
      {rules.loading && (
        <p className="text-sm text-muted-foreground">Loading rules…</p>
      )}
      {!rules.loading && !rules.error && !rules.data.length && (
        <p className="text-sm text-muted-foreground">
          No rules yet. Add a description to recognize automatically.
        </p>
      )}
      <div className="divide-y rounded-lg border">
        {rules.data.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center gap-3 p-3">
            <Switch
              aria-label={`Enable rule for ${rule.match_text}`}
              isSelected={rule.enabled}
              isDisabled={busy}
              onChange={(enabled) => {
                void mutate(`/${rule.id}`, "PUT", {
                  match_text: rule.match_text,
                  type: rule.type,
                  category: rule.category,
                  enabled,
                });
                if (editing?.id === rule.id) resetForm();
              }}
            />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{rule.match_text}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                → {rule.category ?? "Keep CSV category"}
              </span>
            </div>
            <Badge variant={rule.type === "expense" ? "secondary" : "outline"}>
              {rule.type === "expense" ? "Expense" : "Income"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              isDisabled={busy}
              onPress={() => {
                setEditing(rule);
                setMatch(rule.match_text);
                setType(rule.type);
                setCategory(rule.category);
                setMessage(null);
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              isDisabled={busy}
              onPress={async () => {
                if (
                  (await mutate(`/${rule.id}`, "DELETE")) &&
                  editing?.id === rule.id
                )
                  resetForm();
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Matches whole words or phrases, ignoring case. More specific phrases
        win; equal-length matches use the oldest rule. Rules affect new imports,
        not transactions already saved.
      </p>
    </div>
  );
}
