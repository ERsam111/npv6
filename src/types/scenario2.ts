export interface Scenario1Forecast {
  product: string;
  period: Date;
  baselineForecast: number;
  unitOfMeasure: string;
}

export interface Scenario2Adjustment {
  product: string;
  fromPeriod: Date;
  toPeriod: Date;
  adjustmentType: "units" | "percentage";
  adjustmentValue: number;
  notes?: string;
}

export interface Scenario2AdjustmentWithForecast extends Scenario2Adjustment {
  period: Date;
  baselineForecast: number;
  adjustedForecast: number;
}

export interface Scenario2Summary {
  totalBaseline: number;
  totalAdjusted: number;
  totalDifference: number;
  percentageChange: number;
  productsAdjusted: number;
}
