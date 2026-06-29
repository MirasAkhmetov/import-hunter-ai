"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AlertNotificationBell() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((res) => {
        const unread = (res.data ?? []).filter(
          (a: { status: string }) => a.status === "unread"
        ).length;
        setCount(unread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const onRefresh = () => refresh();
    window.addEventListener("alerts-refresh", onRefresh);
    const timer = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("alerts-refresh", onRefresh);
      clearInterval(timer);
    };
  }, [refresh]);

  return (
    <Button variant="ghost" size="sm" asChild className="relative">
      <Link href="/alerts">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs">
            {count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
