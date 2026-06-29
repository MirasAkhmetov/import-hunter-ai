"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Package,
  Globe2,
  ShoppingCart,
  Eye,
  Bookmark,
  Bell,
  Settings,
  Calculator,
  Globe,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertNotificationBell } from "@/components/alerts/AlertNotificationBell";

const navItems = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/analyze", label: "Анализ", icon: Search },
  { href: "/calculator", label: "Калькулятор", icon: Calculator },
  { href: "/analysis-history", label: "История анализов", icon: History },
  { href: "/products", label: "Товары", icon: Package },
  { href: "/country-breakdown", label: "Страны", icon: Globe2 },
  { href: "/purchase-basket", label: "Корзина закупки", icon: ShoppingCart },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/saved", label: "Избранное", icon: Bookmark },
  { href: "/alerts", label: "Уведомления", icon: Bell },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Globe className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-slate-900">ImportHunter AI</h1>
          <p className="text-xs text-slate-500">Импорт в Казахстан</p>
        </div>
        <AlertNotificationBell />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
          <p className="text-xs font-medium text-blue-900">Mock-режим</p>
          <p className="mt-1 text-xs text-blue-700">
            Демо-данные активны
          </p>
        </div>
      </div>
    </aside>
  );
}
