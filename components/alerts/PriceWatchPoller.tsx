"use client";

import { useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function PriceWatchPoller() {
  const running = useRef(false);

  useEffect(() => {
    const runCheck = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check_prices" }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          window.dispatchEvent(
            new CustomEvent("price-alerts-updated", { detail: data.data })
          );
        }
        window.dispatchEvent(new CustomEvent("alerts-refresh"));
      } catch {
        // silent
      } finally {
        running.current = false;
      }
    };

    runCheck();
    const timer = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}
