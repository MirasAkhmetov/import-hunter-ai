"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteAnalysisButtonProps {
  id: string;
  onDeleted?: (id: string) => void;
  redirectTo?: string;
}

export function DeleteAnalysisButton({
  id,
  onDeleted,
  redirectTo,
}: DeleteAnalysisButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Удалить этот анализ из истории?")) return;
    const response = await fetch(`/api/analysis-history/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    onDeleted?.(id);
    router.refresh();
    if (redirectTo) {
      router.push(redirectTo);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDelete}>
      <Trash2 className="mr-1 h-4 w-4 text-red-600" />
      Удалить
    </Button>
  );
}
