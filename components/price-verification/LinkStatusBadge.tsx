"use client";

import { Badge } from "@/components/ui/badge";
import {
  LINK_STATUS_LABELS,
  type LinkStatus,
} from "@/lib/types/priceVerification";

interface LinkStatusBadgeProps {
  status?: LinkStatus;
}

export function LinkStatusBadge({ status }: LinkStatusBadgeProps) {
  if (!status) return null;

  const variant =
    status === "verified"
      ? "success"
      : status === "mismatch" || status === "unavailable"
        ? "danger"
        : "warning";

  return (
    <Badge variant={variant} className="text-[10px]">
      {LINK_STATUS_LABELS[status]}
    </Badge>
  );
}
