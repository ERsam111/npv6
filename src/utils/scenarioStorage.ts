import { ForecastResult } from "@/types/forecasting";
import { Scenario2Adjustment, Scenario2AdjustmentWithForecast } from "@/types/scenario2";
import { Scenario3Output } from "@/types/scenario3";

const SCENARIO1_KEY = "scenario1_results";
const SCENARIO2_KEY = "scenario2_results";
const SCENARIO3_KEY = "scenario3_results";

// Scenario 1 (Baseline Forecast)
export function saveScenario1Results(results: ForecastResult[], product: string, granularity: string) {
  const data = {
    results,
    product,
    granularity,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(SCENARIO1_KEY, JSON.stringify(data));
}

export function getScenario1Results(): { results: ForecastResult[]; product: string; granularity: string } | null {
  const data = localStorage.getItem(SCENARIO1_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    // Convert date strings back to Date objects
    parsed.results = parsed.results.map((r: any) => ({
      ...r,
      predictions: r.predictions.map((p: any) => ({
        ...p,
        date: new Date(p.date)
      }))
    }));
    return parsed;
  } catch {
    return null;
  }
}

// Scenario 2 (Manual Adjustments)
export function saveScenario2Results(adjustments: Scenario2AdjustmentWithForecast[]) {
  const data = {
    adjustments,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(SCENARIO2_KEY, JSON.stringify(data));
}

export function getScenario2Results(): Scenario2AdjustmentWithForecast[] | null {
  const data = localStorage.getItem(SCENARIO2_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    // Convert date strings back to Date objects
    const adjustments = parsed.adjustments.map((a: any) => ({
      ...a,
      fromPeriod: new Date(a.fromPeriod),
      toPeriod: new Date(a.toPeriod),
      period: new Date(a.period)
    }));
    return adjustments;
  } catch {
    return null;
  }
}

// Scenario 3 (Elasticity Adjustments)
export function saveScenario3Results(results: Scenario3Output[]) {
  const data = {
    results,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(SCENARIO3_KEY, JSON.stringify(data));
}

export function getScenario3Results(): { results: Scenario3Output[] } | null {
  const data = localStorage.getItem(SCENARIO3_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    // Convert date strings back to Date objects
    parsed.results = parsed.results.map((r: any) => ({
      ...r,
      period: new Date(r.period)
    }));
    return parsed;
  } catch {
    return null;
  }
}

// Clear all scenario data
export function clearAllScenarios() {
  localStorage.removeItem(SCENARIO1_KEY);
  localStorage.removeItem(SCENARIO2_KEY);
  localStorage.removeItem(SCENARIO3_KEY);
}
