"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (format: "csv" | "xlsx") => {
    setLoading(format);
    try {
      const res = await fetch(`/api/export/${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-hunter-export.${format === "csv" ? "csv" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null}
        onClick={() => download("csv")}
      >
        <Download className="h-4 w-4" />
        {loading === "csv" ? "..." : "CSV"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null}
        onClick={() => download("xlsx")}
      >
        <FileSpreadsheet className="h-4 w-4" />
        {loading === "xlsx" ? "..." : "Excel"}
      </Button>
    </div>
  );
}
