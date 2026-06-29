"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import Image from "next/image";
import { ExternalLink, ArrowUpDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { ImageSimilarityBadge } from "@/components/ImageSimilarityBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { formatKzt } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/currency";
import { MARKETPLACE_LABELS, COUNTRY_LABELS } from "@/lib/types";

import { ManualStatusBadge, ManualStatusButtons } from "@/components/ManualStatusButtons";
import { AddToBasketButton } from "@/components/basket/AddToBasketButton";
import { BuyAlertCheckbox, BuyAlertModal } from "@/components/alerts/BuyAlertComponents";
import { LinkStatusBadge } from "@/components/price-verification/LinkStatusBadge";
import { PriceVerificationBadge } from "@/components/price-verification/PriceVerificationBadge";
import {
  AddToWatchlistDialog,
  type WatchlistItemPayload,
} from "@/components/watchlist/AddToWatchlistDialog";
import type { ManualStatus } from "@/lib/types/extended";
import type { LinkStatus, PriceSource } from "@/lib/types/priceVerification";

export interface ComparisonRow {
  id: string;
  country: string;
  marketplace: string;
  title: string;
  price: number;
  currency: string;
  priceKzt: number;
  imageUrl?: string | null;
  sellerName?: string | null;
  matchScore: number;
  imageSimilarityScore?: number;
  riskScore: number;
  netProfitKzt: number;
  roiPercent: number;
  url: string;
  manualStatus?: ManualStatus;
  isExactMatch?: boolean;
  linkStatus?: LinkStatus;
  priceSource?: PriceSource;
  isMockPrice?: boolean;
  needsProfitReview?: boolean;
  correctedPrice?: number | null;
  originalPrice?: number;
}

interface ComparisonTableProps {
  data: ComparisonRow[];
  productId?: string;
  productTitle?: string;
  kaspiPrice?: number;
  activeMarketplace?: string;
  onMarketplaceSelect?: (marketplaceId: string, country?: string) => void;
  showWatchlist?: boolean;
}

export function ComparisonTable({
  data,
  productId,
  productTitle,
  kaspiPrice,
  activeMarketplace,
  onMarketplaceSelect,
  showWatchlist = false,
}: ComparisonTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "roiPercent", desc: true },
  ]);
  const [alertModal, setAlertModal] = useState<ComparisonRow | null>(null);
  const [alertEnabled, setAlertEnabled] = useState<Record<string, boolean>>({});
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItemPayload | null>(
    null
  );

  const openWatchlist = (row: ComparisonRow) => {
    if (!productId) return;
    setWatchlistItem({
      productId,
      marketplaceResultId: row.id,
      title: row.title,
      productTitle: productTitle ?? row.title,
      marketplace: row.marketplace,
      country: row.country,
      url: row.url,
      currency: row.currency,
      currentPrice: row.price,
      imageUrl: row.imageUrl,
      kaspiPrice,
    });
    setWatchlistOpen(true);
  };

  const columns: ColumnDef<ComparisonRow>[] = [
    {
      accessorKey: "country",
      header: "Страна",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {COUNTRY_LABELS[row.original.country] ?? row.original.country}
        </Badge>
      ),
    },
    {
      accessorKey: "marketplace",
      header: "Маркетплейс",
      cell: ({ row }) =>
        onMarketplaceSelect ? (
          <button
            type="button"
            onClick={() =>
              onMarketplaceSelect(row.original.marketplace, row.original.country)
            }
            className={`text-left hover:text-blue-600 hover:underline ${
              activeMarketplace === row.original.marketplace
                ? "font-semibold text-blue-700"
                : ""
            }`}
          >
            {MARKETPLACE_LABELS[row.original.marketplace] ?? row.original.marketplace}
          </button>
        ) : (
          MARKETPLACE_LABELS[row.original.marketplace] ?? row.original.marketplace
        ),
    },
    {
      accessorKey: "imageUrl",
      header: "Фото",
      cell: ({ row }) =>
        row.original.imageUrl ? (
          <div className="relative h-10 w-10 overflow-hidden rounded">
            <Image
              src={row.original.imageUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      accessorKey: "title",
      header: "Название",
      cell: ({ row }) => (
        <div className="max-w-[200px] space-y-1">
          {row.original.isExactMatch && (
            <Badge variant="success" className="text-[10px]">
              Точное совпадение
            </Badge>
          )}
          <span className="line-clamp-2 text-sm">{row.original.title}</span>
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Цена",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm">
          {row.original.price.toLocaleString("ru-RU")}{" "}
          {getCurrencySymbol(row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "priceKzt",
      header: "Цена KZT",
      cell: ({ row }) => formatKzt(row.original.priceKzt),
    },
    {
      accessorKey: "linkStatus",
      header: "Ссылка",
      cell: ({ row }) => <LinkStatusBadge status={row.original.linkStatus} />,
    },
    {
      accessorKey: "priceSource",
      header: "Источник цены",
      cell: ({ row }) => (
        <PriceVerificationBadge
          priceSource={row.original.priceSource}
          isMockPrice={row.original.isMockPrice}
          needsReview={row.original.needsProfitReview}
        />
      ),
    },
    {
      accessorKey: "sellerName",
      header: "Продавец",
      cell: ({ row }) => row.original.sellerName ?? "—",
    },
    {
      accessorKey: "matchScore",
      header: "Match",
      cell: ({ row }) => <MatchScoreBadge score={row.original.matchScore} />,
    },
    {
      accessorKey: "imageSimilarityScore",
      header: "Фото",
      cell: ({ row }) => (
        <ImageSimilarityBadge score={row.original.imageSimilarityScore ?? 0} />
      ),
    },
    {
      accessorKey: "riskScore",
      header: "Риск",
      cell: ({ row }) => <RiskBadge score={row.original.riskScore} />,
    },
    {
      accessorKey: "netProfitKzt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Прибыль
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span
          className={
            row.original.netProfitKzt > 0
              ? "font-semibold text-emerald-600"
              : "font-semibold text-red-600"
          }
        >
          {formatKzt(row.original.netProfitKzt)}
        </span>
      ),
    },
    {
      accessorKey: "roiPercent",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ROI
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => `${row.original.roiPercent.toFixed(1)}%`,
    },
    {
      accessorKey: "manualStatus",
      header: "Проверка",
      cell: ({ row }) => (
        productId ? (
          <ManualStatusButtons
            marketplaceResultId={row.original.id}
            status={row.original.manualStatus ?? "review"}
          />
        ) : (
          <ManualStatusBadge status={row.original.manualStatus ?? "review"} />
        )
      ),
    },
    {
      id: "buyAlert",
      header: "Buy Alert",
      cell: ({ row }) => (
        <div className="space-y-1">
          <BuyAlertCheckbox
            checked={alertEnabled[row.original.id] ?? false}
            onChange={(checked) => {
              setAlertEnabled((prev) => ({ ...prev, [row.original.id]: checked }));
              if (checked) setAlertModal(row.original);
            }}
          />
          {alertEnabled[row.original.id] && (
            <p className="text-xs text-slate-500">
              {formatKzt(row.original.priceKzt)}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "basket",
      header: "",
      cell: ({ row }) =>
        productId && kaspiPrice ? (
          <AddToBasketButton
            item={{
              productId,
              marketplaceResultId: row.original.id,
              title: row.original.title,
              marketplace: row.original.marketplace,
              country: row.original.country,
              purchasePrice: row.original.priceKzt,
              targetSalePrice: kaspiPrice,
              url: row.original.url,
              imageUrl: row.original.imageUrl ?? undefined,
            }}
          />
        ) : null,
    },
    ...(showWatchlist && productId
      ? [
          {
            id: "watchlist",
            header: "Watchlist",
            cell: ({ row }: { row: { original: ComparisonRow } }) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openWatchlist(row.original)}
              >
                <Bell className="mr-1 h-3 w-3" />
                Watchlist
              </Button>
            ),
          } as ColumnDef<ComparisonRow>,
        ]
      : []),
    {
      id: "actions",
      header: "Ссылка",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <a href={row.original.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-slate-50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left font-medium text-slate-600"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-slate-50/50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {alertModal && productId && (
      <BuyAlertModal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        defaults={{
          targetBuyPrice: alertModal.priceKzt,
          minProfit: alertModal.netProfitKzt,
          minRoi: alertModal.roiPercent,
        }}
        onSubmit={async (alertData) => {
          await fetch("/api/watchlist/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              marketplaceResultId: alertModal.id,
              title: alertModal.title,
              marketplace: alertModal.marketplace,
              country: alertModal.country,
              targetPurchasePrice: alertData.targetBuyPrice,
              minProfit: alertData.minProfit,
              minRoi: alertData.minRoi,
              currentPrice: alertModal.priceKzt,
              buyAlertEnabled: true,
              targetBuyPrice: alertData.targetBuyPrice,
              targetQuantity: alertData.targetQuantity,
              comment: alertData.comment,
              url: alertModal.url,
            }),
          });
        }}
      />
    )}

    <AddToWatchlistDialog
      open={watchlistOpen}
      onOpenChange={setWatchlistOpen}
      item={watchlistItem}
    />
    </>
  );
}
