"use client";

import { Badge } from "@/components/ui/badge";

interface MatchScoreBadgeProps {
  score: number;
}

export function MatchScoreBadge({ score }: MatchScoreBadgeProps) {
  const variant =
    score >= 80 ? "success" : score >= 60 ? "warning" : "danger";

  return (
    <Badge variant={variant}>
      Совпадение {score}%
    </Badge>
  );
}
