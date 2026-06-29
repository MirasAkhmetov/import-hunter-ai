"use client";

import { Badge } from "@/components/ui/badge";

interface ImageSimilarityBadgeProps {
  score: number;
}

export function ImageSimilarityBadge({ score }: ImageSimilarityBadgeProps) {
  const variant =
    score >= 80 ? "success" : score >= 60 ? "warning" : "danger";

  return (
    <Badge variant={variant}>
      Фото {score}%
    </Badge>
  );
}
