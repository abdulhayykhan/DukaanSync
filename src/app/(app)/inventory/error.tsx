"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error("Inventory Page Error:", error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-2xl border border-gray-100">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
        <AlertCircle className="h-10 w-10 text-red-600" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
        Oops! Something went wrong.
      </h2>
      <p className="mb-8 max-w-md text-gray-500">
        We encountered an unexpected error while loading the inventory. This could be due to missing product data or a temporary network issue.
      </p>
      
      {/* Dev-only error trace */}
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-8 w-full max-w-2xl text-left bg-red-50 p-4 rounded-lg border border-red-100 overflow-auto">
          <p className="font-mono text-sm text-red-800 break-words font-semibold">
            {error.message}
          </p>
          <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
            {error.stack}
          </pre>
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
