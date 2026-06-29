import type {
  AnalysisSnapshot,
  AnalysisSnapshotType,
} from "../types/analysisHistory";

export function getSnapshotData<T>(
  snapshots: AnalysisSnapshot[],
  type: AnalysisSnapshotType
): T | null {
  const snap = snapshots.find((s) => s.snapshotType === type);
  return (snap?.data as T) ?? null;
}
