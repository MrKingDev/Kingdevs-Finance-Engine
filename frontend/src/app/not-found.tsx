// src/app/not-found.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex max-w-lg flex-col items-center text-center">
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>

        <h1 className="mt-4 text-7xl font-bold tracking-tight">404</h1>

        <h2 className="mt-4 text-2xl font-semibold">Page not found</h2>

        <p className="mt-3 text-muted-foreground">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="mt-8 flex gap-3">
          <Button variant="outline">
            <Link href="/">Go back home</Link>
          </Button>

          <Button>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
