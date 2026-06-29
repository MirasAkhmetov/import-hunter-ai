"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SNAPSHOT_TYPE_LABELS } from "@/lib/types/analysisHistory";
import type { AnalysisSnapshot } from "@/lib/types/analysisHistory";

interface AnalysisSnapshotViewerProps {
  snapshots: AnalysisSnapshot[];
  type: AnalysisSnapshot["snapshotType"];
  title?: string;
}

export function AnalysisSnapshotViewer({
  snapshots,
  type,
  title,
}: AnalysisSnapshotViewerProps) {
  const snapshot = snapshots.find((s) => s.snapshotType === type);
  if (!snapshot) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title ?? SNAPSHOT_TYPE_LABELS[type]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-96 overflow-auto rounded border bg-slate-50 p-4 text-xs">
          {JSON.stringify(snapshot.data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
