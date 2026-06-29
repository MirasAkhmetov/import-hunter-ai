"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  entityId: string;
  entityType: "product" | "marketplace_result";
  initialFavorite?: boolean;
  size?: "sm" | "default";
}

export function FavoriteButton({
  entityId,
  entityType,
  initialFavorite = false,
  size = "sm",
}: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, entityType }),
      });
      const data = await res.json();
      if (data.success) setFavorite(data.data.favorite);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      disabled={loading}
      onClick={toggle}
      title={favorite ? "Убрать из избранного" : "В избранное"}
    >
      <Star
        className={cn(
          "h-4 w-4",
          favorite ? "fill-amber-400 text-amber-400" : "text-slate-400"
        )}
      />
    </Button>
  );
}
