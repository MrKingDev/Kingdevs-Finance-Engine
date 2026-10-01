"use client";

import { useEffect, useState } from "react";

export function BackendTest() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkBackend() {
      try {
        // FETCHES API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/health`,
        );

        // Checks if request failed
        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        // Checks if API didn't connect
        setStatus(data.status);
      } catch (error) {
        console.error(error);
        setError("Could not connect to backend");
      }
    }

    checkBackend();
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
