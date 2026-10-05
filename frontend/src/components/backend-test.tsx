"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/finance-api";

export function BackendTest() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function checkBackend() {
      try {
        // FETCHES API
        const response = await fetch(`${API_URL}/health`, {
          signal: controller.signal,
          cache: "no-store",
        });

        // Checks if request failed
        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        // Checks if API didn't connect
        if (!controller.signal.aborted) setStatus(data.status);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setError("Could not connect to backend");
        }
      }
    }

    void checkBackend();
    return () => controller.abort();
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <p>
      Backend Status: <span className="text-green-500">{status}</span>
    </p>
  );
}
