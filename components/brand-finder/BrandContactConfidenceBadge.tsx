import { Badge } from "@/components/ui/badge";
import {
  getConfidenceLevel,
  getConfidenceLevelLabel,
} from "@/lib/brand-finder/confidenceScoring";

interface BrandContactConfidenceBadgeProps {
  score: number;
}

export function BrandContactConfidenceBadge({
  score,
}: BrandContactConfidenceBadgeProps) {
  const level = getConfidenceLevel(score);
  const variant =
    level === "high" ? "success" : level === "medium" ? "warning" : "danger";

  return (
    <Badge variant={variant}>
      {getConfidenceLevelLabel(score)} · {score}%
    </Badge>
  );
}
