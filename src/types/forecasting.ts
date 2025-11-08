export interface HistoricalDataPoint {
  date: Date;
  customer: string;
  product: string;
  demand: number;
  unitOfMeasure: string;
}

export interface ForecastingModel {
  id: string;
  name: string;
  description: string;
}

export interface ForecastResult {
  modelId: string;
  modelName: string;
  predictions: {
    date: Date;
    predicted: number;
  }[];
  mape: number; // Mean Absolute Percentage Error
  isRecommended: boolean;
}

export type ForecastGranularity = "daily" | "weekly" | "monthly";

export interface ForecastConfig {
  historicalData: HistoricalDataPoint[];
  forecastPeriods: number;
  selectedModels: string[];
  product: string;
  customer?: string;
  granularity: ForecastGranularity;
}
