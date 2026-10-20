"use client";

import { useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { API_URL, apiError, notifyFinanceChanged } from "@/lib/finance-api";

const ClearData = () => {
  const [confirmation, setConfirmation] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleClearData = async () => {
    if (confirmation !== "CLEAR") {
      setError("Type CLEAR to confirm.");
      return;
    }

    try {
      setIsClearing(true);
      setMessage("");
      setError("");

      const response = await fetch(`${API_URL}/data/clear`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      if (!response.ok) {
        throw new Error(await apiError(response, "Failed to clear data."));
      }

      setConfirmation("");
      setMessage("Transactions, budgets, and categories cleared successfully.");
      notifyFinanceChanged();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while clearing your data.",
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Clears transactions, budgets, and categories. Subscriptions, payment
        history, and import rules are kept; their category selections are
        cleared.
      </p>
      <Field>
        <FieldLabel htmlFor="clearData">Type CLEAR to confirm</FieldLabel>
        <Input
          id="clearData"
          type="text"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="CLEAR"
          autoComplete="off"
        />
      </Field>
      {/* Delete data Button */}
      <AlertDialogTrigger>
        <Button variant="destructive" className="mt-4">
          {isClearing ? "Clearing..." : "Clear Data"}
        </Button>
        <AlertDialog>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Never Mind</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              isDisabled={confirmation !== "CLEAR" || isClearing}
              onPress={handleClearData}
            >
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialogTrigger>

      {message && (
        <output className="mt-2 block text-sm text-muted-foreground">
          {message}
        </output>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
};

export default ClearData;
