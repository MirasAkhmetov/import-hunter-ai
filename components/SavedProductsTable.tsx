"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import Image from "next/image";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKzt } from "@/lib/utils";
import { MARKETPLACE_LABELS } from "@/lib/types";

export interface SavedProductRow {
  id: string;
  title: string;
  imageUrl?: string | null;
  kaspiPrice: number;
  marketplace: string;
  purchasePriceKzt: number;
  netProfitKzt: number;
  roiPercent: number;
  url: string;
  savedAt: string;
}

interface SavedProductsTableProps {
  data: SavedProductRow[];
  onRemove?: (id: string) => void;
}

export function SavedProductsTable({ data, onRemove }: SavedProductsTableProps) {
  const columns: ColumnDef<SavedProductRow>[] = [
    {
      accessorKey: "imageUrl",
      header: "",
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
        ) : null,
    },
    {
      accessorKey: "title",
      header: "Товар",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[250px] font-medium">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "kaspiPrice",
      header: "Kaspi",
      cell: ({ row }) => formatKzt(row.original.kaspiPrice),
    },
    {
      accessorKey: "marketplace",
      header: "Источник",
      cell: ({ row }) => (
        <Badge variant="outline">
          {MARKETPLACE_LABELS[row.original.marketplace] ?? row.original.marketplace}
        </Badge>
      ),
    },
    {
      accessorKey: "purchasePriceKzt",
      header: "Закупка",
      cell: ({ row }) => formatKzt(row.original.purchasePriceKzt),
    },
    {
      accessorKey: "netProfitKzt",
      header: "Прибыль",
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-600">
          {formatKzt(row.original.netProfitKzt)}
        </span>
      ),
    },
    {
      accessorKey: "roiPercent",
      header: "ROI",
      cell: ({ row }) => `${row.original.roiPercent.toFixed(1)}%`,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a href={row.original.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(row.original.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-slate-50 p-12 text-center">
        <p className="text-slate-500">Нет сохранённых товаров</p>
        <p className="mt-1 text-sm text-slate-400">
          Сохраняйте прибыльные варианты из результатов анализа
        </p>
      </div>
    );
  }

  return (
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
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
  );
}
