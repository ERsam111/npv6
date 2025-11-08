export interface Scenario3Input {
  product_name: string;
  fromPeriod: Date;
  toPeriod: Date;
  elasticity: number;
  base_price: number;
  discount_rate: number;
  target_units?: number;
  target_revenue?: number;
}

export interface Scenario3EnrichedInput {
  product_id: string;
  product_name: string;
  period: Date;
  scenario2_forecast: number;
  base_price: number;
  actual_price: number;
  promotion_flag: 0 | 1;
  discount_rate: number;
  elasticity: number;
  target_units?: number;
  target_revenue?: number;
}

export interface Scenario3Output {
  product_id: string;
  product_name: string;
  period: Date;
  scenario2_forecast: number;
  base_price: number;
  actual_price: number;
  price_change_percent: number;
  elasticity: number;
  promotion_flag: 0 | 1;
  discount_rate: number;
  adjusted_forecast_units: number;
  target_units?: number;
  target_revenue?: number;
  recommended_price?: number;
  recommended_discount_percent?: number;
  notes: string;
}

export interface Scenario3KPIs {
  totalAdjustedUnits: number;
  totalRevenue: number;
  avgVolumeLift: number;
  avgDiscountPercent: number;
  percentDiffVsScenario2: number;
  percentDiffVsTarget: number;
}
