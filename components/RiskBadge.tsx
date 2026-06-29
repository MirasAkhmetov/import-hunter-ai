"use client";

import { Badge } from "@/components/ui/badge";

interface RiskBadgeProps {
  score: number;
}

export function RiskBadge({ score }: RiskBadgeProps) {
  const label = score < 30 ? "Низкий риск" : score < 60 ? "Средний риск" : "Высокий риск";
  const variant = score < 30 ? "success" : score < 60 ? "warning" : "danger";

  return (
    <Badge variant={variant}>
      {label} ({score}%)
    </Badge>
  );
}
