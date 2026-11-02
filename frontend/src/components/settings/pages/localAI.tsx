"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { API_URL, apiError } from "@/lib/finance-api";

export default function LocalAISettings() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  async function check() {
    setChecking(true);
    try {
      const response = await fetch(`${API_URL}/ai/status`, { cache: "no-store" });
      if (!response.ok) throw new Error(await apiError(response, "Unable to check AI connection."));
      const data = await response.json();
      setStatus(`${data.model}: ${data.message}`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Connection check failed."); }
    finally { setChecking(false); }
  }
  return <div className="max-w-3xl space-y-5">
    <p>Your assistant reads a fresh financial snapshot for the month you select. It includes full monthly totals, up to 30 recent transactions, monthly budgets, current active subscriptions and goals. It cannot change your records.</p>
    <div className="space-y-2">
      <h3 className="font-semibold">Run Ollama with Docker</h3>
      <p className="text-sm text-muted-foreground">Run these commands from the project root. The model stays in a persistent Docker volume. The first download can take several minutes; this configuration runs on CPU.</p>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">{`docker compose -f backend/docker-compose.yml -f compose.ai.yaml up -d ollama
docker compose -f backend/docker-compose.yml -f compose.ai.yaml exec ollama ollama pull qwen3:4b
docker compose -f backend/docker-compose.yml -f compose.ai.yaml up -d --build`}</pre>
    </div>
    <div className="space-y-2">
      <h3 className="font-semibold">Or use Ollama on Windows</h3>
      <p className="text-sm">Install <a className="underline" href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">Ollama for Windows</a>, keep it running, and run <code>ollama pull qwen3:4b</code>. The standard Docker configuration connects to it at <code>host.docker.internal:11434</code>.</p>
      <p className="text-sm text-muted-foreground">Windows Ollama and Docker Ollama have separate model libraries. Set OLLAMA_MODEL in backend/.env to a model installed on the server the backend uses, then recreate the backend. If the backend runs directly on your computer, its default address is 127.0.0.1:11434. If Docker cannot reach Windows Ollama, use the Docker setup above.</p>
    </div>
    <p className="text-sm text-muted-foreground">Financial context goes to the Ollama server configured on your backend. The supplied Docker setup disables Ollama cloud features and keeps its API inside the Docker network.</p>
    <Button isDisabled={checking} onPress={() => void check()}>{checking ? "Checking..." : "Check AI connection"}</Button>
    <p role="status" className="text-sm">{status}</p>
    <a href="/ai" className="block text-sm underline">Open AI assistant</a>
  </div>;
}
