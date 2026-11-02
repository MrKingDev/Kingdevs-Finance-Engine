"use client";

import { useState } from "react";
import PageTransition from "@/components/pageTransitions";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { API_URL, apiError } from "@/lib/finance-api";
import { useRegionalFormat } from "@/components/preferences/preferencesProvider";

export default function AI() {
  const { today } = useRegionalFormat();
  const [chosenPeriod, setPeriod] = useState<string | null>(null);
  const period = chosenPeriod ?? `${today().slice(0, 7)}-01`;
  const [coverage, setCoverage] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError("");
    setReply("");
    setCoverage("");

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) }),
      });

      if (!response.ok) {
        throw new Error(await apiError(response, "Request failed."));
      }

      const data = await response.json();
      setReply(data.reply);
      setCoverage(`${data.period.start} to ${data.period.end}: ${data.coverage.transactions_shown} transactions shown to AI, ${data.coverage.transactions_omitted} omitted. Totals include the entire month. Goals and subscriptions reflect current saved state.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Local AI assistant</h1>
        <p className="text-muted-foreground">
          Ask about your saved transactions, budgets, subscriptions and goals. A read-only financial snapshot is sent to the configured Ollama server with each question.
        </p>

        <a href="/settings#ai" className="block text-sm underline">Local AI setup and connection status</a>
        <div className="space-y-2">
          <label htmlFor="financial-month-input" className="block font-medium">Financial month</label>
          <DatePickerInput id="financial-month" monthOnly minValue="2000-01-01" maxValue="2100-12-31" value={period} disabled={loading} placeholder="Select financial month" onChange={(value) => { setPeriod(value); setReply(""); setCoverage(""); }} />
          <p className="text-xs text-muted-foreground">Select any date in the month you want to review. The entire month is included.</p>
        </div>
        <p className="text-xs text-muted-foreground">Totals cover the whole selected month. The AI sees up to 30 recent transactions and 30 items per summary list; it cannot edit records. Questions are independent.</p>
        <label htmlFor="ai-message" className="block font-medium">
          Your question
        </label>
        <textarea
          id="ai-message"
          className="min-h-32 w-full rounded-lg border bg-background p-3"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How can I organize a monthly budget?"
          maxLength={4000}
          disabled={loading}
        />

        <Button onPress={sendMessage} isDisabled={loading || !message.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(period)}>
          {loading ? "Thinking…" : "Send"}
        </Button>

        {error && (
          <p role="alert" className="text-red-500">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground" role="status">{coverage}</p>
        <div aria-live="polite">
          {reply && (
            <div className="whitespace-pre-wrap rounded-lg border p-4">
              {reply}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
