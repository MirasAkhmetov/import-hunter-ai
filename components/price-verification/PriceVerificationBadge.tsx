"use client";

import { Badge } from "@/components/ui/badge";
import {
  PRICE_SOURCE_LABELS,
  type PriceSource,
} from "@/lib/types/priceVerification";

interface PriceVerificationBadgeProps {
  priceSource?: PriceSource;
  isMockPrice?: boolean;
  needsReview?: boolean;
}

export function PriceVerificationBadge({
  priceSource,
  isMockPrice,
  needsReview,
}: PriceVerificationBadgeProps) {
  if (isMockPrice || needsReview) {
    return (
      <Badge variant="warning" className="text-[10px]">
        Цена не подтверждена
      </Badge>
    );
  }

  if (!priceSource) return null;

  const variant =
    priceSource === "manual_override"
      ? "secondary"
      : priceSource === "product_page"
        ? "success"
        : "outline";

  return (
    <Badge variant={variant} className="text-[10px]">
      {PRICE_SOURCE_LABELS[priceSource]}
    </Badge>
  );
}
