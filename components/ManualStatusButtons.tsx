"use client";

import { useState } from "react";
import { Check, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ManualStatus } from "@/lib/types/extended";
import { MANUAL_STATUS_LABELS } from "@/lib/types/extended";

interface ManualStatusButtonsProps {
  marketplaceResultId: string;
  status?: ManualStatus;
  onUpdate?: (status: ManualStatus) => void;
}

export function ManualStatusButtons({
  marketplaceResultId,
  status = "review",
  onUpdate,
}: ManualStatusButtonsProps) {
  const [current, setCurrent] = useState<ManualStatus>(status);
  const [loading, setLoading] = useState(false);

  const update = async (newStatus: ManualStatus) => {
    setLoading(true);
    try {
      await fetch("/api/manual-status/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceResultId, status: newStatus }),
      });
      setCurrent(newStatus);
      onUpdate?.(newStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ManualStatusBadge status={current} />
      <Button
        size="sm"
        variant={current === "approved" ? "default" : "outline"}
        disabled={loading}
        onClick={() => update("approved")}
      >
        <Check className="h-3 w-3" />
        Подходит
      </Button>
      <Button
        size="sm"
        variant={current === "review" ? "default" : "outline"}
        disabled={loading}
        onClick={() => update("review")}
      >
        <HelpCircle className="h-3 w-3" />
        Проверить
      </Button>
      <Button
        size="sm"
        variant={current === "rejected" ? "destructive" : "outline"}
        disabled={loading}
        onClick={() => update("rejected")}
      >
        <X className="h-3 w-3" />
        Не подходит
      </Button>
    </div>
  );
}

export function ManualStatusBadge({ status }: { status: ManualStatus }) {
  const variant =
    status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
  return <Badge variant={variant}>{MANUAL_STATUS_LABELS[status]}</Badge>;
}
