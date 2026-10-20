"use client";

import { useState } from "react";
import PageTransition from "@/components/pageTransitions";
import { Button } from "@/components/ui/button";
import { API_URL, apiError } from "@/lib/finance-api";

export default function AI() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError("");
    setReply("");

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!response.ok) {
        throw new Error(await apiError(response, "Request failed."));
      }

      const data = await response.json();
      setReply(data.reply);
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
          Ask a question. Financial records are not connected yet.
        </p>

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

        <Button onClick={sendMessage} disabled={loading || !message.trim()}>
          {loading ? "Thinking…" : "Send"}
        </Button>

        {error && (
          <p role="alert" className="text-red-500">
            {error}
          </p>
        )}

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
