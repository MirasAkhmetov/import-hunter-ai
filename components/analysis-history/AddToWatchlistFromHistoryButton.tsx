"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToWatchlistFromHistoryButtonProps {
  runId: string;
  size?: "default" | "sm";
}

export function AddToWatchlistFromHistoryButton({
  runId,
  size = "sm",
}: AddToWatchlistFromHistoryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist/add-from-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/watchlist");
        return;
      }
      setError(data.error ?? "Ошибка");
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <Button variant="default" size={size} onClick={handleAdd} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Bell className="mr-1 h-3 w-3" />
        )}
        {loading ? "…" : "Watchlist"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
