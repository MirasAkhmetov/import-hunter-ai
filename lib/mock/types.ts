export interface RawItem {
  id: string;
  title: string;
  marketplace: string;
  country: string;
  purchasePriceKzt: number;
  deliveryCostKzt: number;
  netProfitKzt: number;
  roiPercent: number;
  riskScore: number;
  matchScore: number;
  brand?: string | null;
  category?: string | null;
  manualStatus: string;
  productTitle: string;
}
