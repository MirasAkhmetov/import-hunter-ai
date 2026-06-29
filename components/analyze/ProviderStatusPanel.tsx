"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MARKETPLACE_LABELS } from "@/lib/types";
import type { ProviderStatusInfo } from "@/lib/marketplaces/manager";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ProviderStatusInfo["status"], string> = {
  active: "Активен",
  mock: "Mock",
  failed: "Ошибка",
  disabled: "Отключён",
};

const STATUS_VARIANT: Record<
  ProviderStatusInfo["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  mock: "secondary",
  failed: "destructive",
  disabled: "outline",
};

interface ProviderStatusPanelProps {
  statuses: ProviderStatusInfo[];
  activeMarketplace?: string;
  onMarketplaceSelect?: (marketplaceId: string) => void;
}

export function ProviderStatusPanel({
  statuses,
  activeMarketplace = "all",
  onMarketplaceSelect,
}: ProviderStatusPanelProps) {
  if (statuses.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Статус маркетплейсов</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <button
            key={item.marketplace}
            type="button"
            disabled={!onMarketplaceSelect || item.resultCount === 0}
            onClick={() => onMarketplaceSelect?.(item.marketplace)}
            className={cn(
              "rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300",
              onMarketplaceSelect && item.resultCount > 0 && "cursor-pointer"
            )}
          >
            <Badge
              variant={STATUS_VARIANT[item.status]}
              className={cn(
                "gap-1",
                activeMarketplace === item.marketplace && "ring-2 ring-blue-400"
              )}
            >
              {MARKETPLACE_LABELS[item.marketplace] ?? item.name}
              <span className="opacity-70">· {STATUS_LABELS[item.status]}</span>
              {item.resultCount > 0 && (
                <span className="opacity-70">({item.resultCount})</span>
              )}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
