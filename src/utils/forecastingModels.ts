import { HistoricalDataPoint, ForecastResult } from "@/types/forecasting";

// Available forecasting models
export const FORECASTING_MODELS = [
  {
    id: "moving_average",
    name: "Moving Average",
    description: "Simple moving average over recent periods"
  },
  {
    id: "exponential_smoothing",
    name: "Exponential Smoothing",
    description: "Weighted average giving more importance to recent data"
  },
  {
    id: "linear_regression",
    name: "Linear Regression",
    description: "Trend-based linear forecasting"
  },
  {
    id: "seasonal_naive",
    name: "Seasonal Naive",
    description: "Uses same period from previous year"
  },
  {
    id: "weighted_moving_average",
    name: "Weighted Moving Average",
    description: "Moving average with higher weights for recent periods"
  },
  {
    id: "holt_winters",
    name: "Holt-Winters",
    description: "Triple exponential smoothing with trend and seasonality"
  },
  {
    id: "random_forest",
    name: "Random Forest",
    description: "Ensemble learning method using multiple decision trees"
  },
  {
    id: "arima",
    name: "ARIMA",
    description: "AutoRegressive Integrated Moving Average model"
  }
];

// Calculate MAPE (Mean Absolute Percentage Error)
function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || actual.length !== predicted.length) return 0;
  
  let sum = 0;
  let count = 0;
  
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
      count++;
    }
  }
  
  return count > 0 ? (sum / count) * 100 : 0;
}

// Moving Average Model
function movingAverageForecasting(
  data: number[],
  forecastPeriods: number,
  window: number = 3
): number[] {
  const predictions: number[] = [];
  const workingData = [...data];
  
  for (let i = 0; i < forecastPeriods; i++) {
    const start = Math.max(0, workingData.length - window);
    const subset = workingData.slice(start);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    predictions.push(avg);
    workingData.push(avg);
  }
  
  return predictions;
}

// Exponential Smoothing
function exponentialSmoothingForecasting(
  data: number[],
  forecastPeriods: number,
  alpha: number = 0.3
): number[] {
  if (data.length === 0) return [];
  
  let smoothed = data[0];
  const predictions: number[] = [];
  
  // Calculate smoothed values for historical data
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  
  // Forecast future periods
  for (let i = 0; i < forecastPeriods; i++) {
    predictions.push(smoothed);
  }
  
  return predictions;
}

// Linear Regression
function linearRegressionForecasting(
  data: number[],
  forecastPeriods: number
): number[] {
  const n = data.length;
  if (n === 0) return [];
  
  // Calculate slope and intercept
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate predictions
  const predictions: number[] = [];
  for (let i = 0; i < forecastPeriods; i++) {
    const x = n + i;
    predictions.push(Math.max(0, slope * x + intercept));
  }
  
  return predictions;
}

// Seasonal Naive (uses same period from previous year)
function seasonalNaiveForecasting(
  data: number[],
  forecastPeriods: number,
  seasonLength: number = 12
): number[] {
  const predictions: number[] = [];
  
  for (let i = 0; i < forecastPeriods; i++) {
    const seasonalIndex = data.length - seasonLength + (i % seasonLength);
    if (seasonalIndex >= 0 && seasonalIndex < data.length) {
      predictions.push(data[seasonalIndex]);
    } else {
      predictions.push(data[data.length - 1]);
    }
  }
  
  return predictions;
}

// Weighted Moving Average
function weightedMovingAverageForecasting(
  data: number[],
  forecastPeriods: number,
  window: number = 3
): number[] {
  const predictions: number[] = [];
  const workingData = [...data];
  
  for (let i = 0; i < forecastPeriods; i++) {
    const start = Math.max(0, workingData.length - window);
    const subset = workingData.slice(start);
    
    // Calculate weighted average (more recent = higher weight)
    let weightedSum = 0;
    let weightTotal = 0;
    
    for (let j = 0; j < subset.length; j++) {
      const weight = j + 1;
      weightedSum += subset[j] * weight;
      weightTotal += weight;
    }
    
    const prediction = weightedSum / weightTotal;
    predictions.push(prediction);
    workingData.push(prediction);
  }
  
  return predictions;
}

// Holt-Winters Triple Exponential Smoothing
function holtWintersForecasting(
  data: number[],
  forecastPeriods: number,
  alpha: number = 0.3,
  beta: number = 0.1,
  gamma: number = 0.1,
  seasonLength: number = 12
): number[] {
  if (data.length < seasonLength * 2) {
    // Fallback to exponential smoothing if insufficient data
    return exponentialSmoothingForecasting(data, forecastPeriods, alpha);
  }

  const n = data.length;
  const level: number[] = new Array(n);
  const trend: number[] = new Array(n);
  const seasonal: number[] = new Array(n);

  // Initialize
  level[0] = data[0];
  trend[0] = (data[seasonLength] - data[0]) / seasonLength;
  
  // Initialize seasonal factors
  for (let i = 0; i < seasonLength; i++) {
    seasonal[i] = data[i] / level[0];
  }

  // Calculate level, trend, and seasonal components
  for (let i = 1; i < n; i++) {
    const seasonalIdx = i % seasonLength;
    
    level[i] = alpha * (data[i] / seasonal[seasonalIdx]) + 
                (1 - alpha) * (level[i - 1] + trend[i - 1]);
    
    trend[i] = beta * (level[i] - level[i - 1]) + (1 - beta) * trend[i - 1];
    
    seasonal[i] = gamma * (data[i] / level[i]) + (1 - gamma) * seasonal[seasonalIdx];
  }

  // Generate forecasts
  const predictions: number[] = [];
  for (let i = 0; i < forecastPeriods; i++) {
    const seasonalIdx = (n + i) % seasonLength;
    const forecast = (level[n - 1] + (i + 1) * trend[n - 1]) * seasonal[seasonalIdx];
    predictions.push(Math.max(0, forecast));
  }

  return predictions;
}

// Random Forest (simplified version using bootstrap aggregating)
function randomForestForecasting(
  data: number[],
  forecastPeriods: number,
  nTrees: number = 10,
  windowSize: number = 5
): number[] {
  if (data.length < windowSize + 1) {
    return movingAverageForecasting(data, forecastPeriods, Math.min(3, data.length));
  }

  // Create training samples (features and targets)
  const samples: { features: number[]; target: number }[] = [];
  for (let i = windowSize; i < data.length; i++) {
    const features = data.slice(i - windowSize, i);
    const target = data[i];
    samples.push({ features, target });
  }

  // Build multiple trees (simplified decision trees)
  const trees: Array<(features: number[]) => number> = [];
  for (let t = 0; t < nTrees; t++) {
    // Bootstrap sample
    const bootstrapSample: typeof samples = [];
    for (let i = 0; i < samples.length; i++) {
      const randomIdx = Math.floor(Math.random() * samples.length);
      bootstrapSample.push(samples[randomIdx]);
    }

    // Simple tree: average of similar patterns
    trees.push((features: number[]) => {
      let sumTargets = 0;
      let sumWeights = 0;
      
      for (const sample of bootstrapSample) {
        // Calculate similarity (inverse of distance)
        let distance = 0;
        for (let i = 0; i < features.length; i++) {
          distance += Math.abs(features[i] - sample.features[i]);
        }
        const weight = 1 / (1 + distance);
        sumTargets += sample.target * weight;
        sumWeights += weight;
      }
      
      return sumWeights > 0 ? sumTargets / sumWeights : 0;
    });
  }

  // Generate predictions
  const predictions: number[] = [];
  const workingData = [...data];

  for (let i = 0; i < forecastPeriods; i++) {
    const features = workingData.slice(-windowSize);
    
    // Average predictions from all trees
    let treePredictions = 0;
    for (const tree of trees) {
      treePredictions += tree(features);
    }
    const prediction = Math.max(0, treePredictions / trees.length);
    
    predictions.push(prediction);
    workingData.push(prediction);
  }

  return predictions;
}

// ARIMA (simplified implementation)
function arimaForecasting(
  data: number[],
  forecastPeriods: number,
  p: number = 2,
  d: number = 1,
  q: number = 2
): number[] {
  if (data.length < p + d + q + 2) {
    return linearRegressionForecasting(data, forecastPeriods);
  }

  // Differencing (I component)
  let differencedData = [...data];
  for (let i = 0; i < d; i++) {
    const newDiff: number[] = [];
    for (let j = 1; j < differencedData.length; j++) {
      newDiff.push(differencedData[j] - differencedData[j - 1]);
    }
    differencedData = newDiff;
  }

  // AR component: autoregressive coefficients
  const arCoeffs: number[] = [];
  for (let lag = 1; lag <= p; lag++) {
    let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, n = 0;
    for (let i = lag; i < differencedData.length; i++) {
      const x = differencedData[i - lag];
      const y = differencedData[i];
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
      n++;
    }
    if (n > 0) {
      const coeff = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      arCoeffs.push(isNaN(coeff) ? 0.5 : coeff);
    } else {
      arCoeffs.push(0.5);
    }
  }

  // MA component: moving average of residuals
  const residuals: number[] = [];
  for (let i = p; i < differencedData.length; i++) {
    let predicted = 0;
    for (let j = 0; j < p; j++) {
      predicted += arCoeffs[j] * differencedData[i - j - 1];
    }
    residuals.push(differencedData[i] - predicted);
  }

  const maCoeffs: number[] = new Array(q).fill(0.3);

  // Generate forecasts on differenced data
  const workingDiff = [...differencedData];
  const workingResiduals = [...residuals];
  const diffPredictions: number[] = [];

  for (let i = 0; i < forecastPeriods; i++) {
    let prediction = 0;
    
    // AR part
    for (let j = 0; j < Math.min(p, workingDiff.length); j++) {
      prediction += arCoeffs[j] * workingDiff[workingDiff.length - 1 - j];
    }
    
    // MA part
    for (let j = 0; j < Math.min(q, workingResiduals.length); j++) {
      prediction += maCoeffs[j] * workingResiduals[workingResiduals.length - 1 - j];
    }
    
    diffPredictions.push(prediction);
    workingDiff.push(prediction);
    workingResiduals.push(0); // Assume zero residual for future
  }

  // Reverse differencing
  const predictions: number[] = [];
  let lastValue = data[data.length - 1];
  
  for (let i = 0; i < forecastPeriods; i++) {
    lastValue = lastValue + diffPredictions[i];
    predictions.push(Math.max(0, lastValue));
  }

  return predictions;
}

// Aggregate data by granularity
function aggregateDataByGranularity(
  data: HistoricalDataPoint[],
  granularity: "daily" | "weekly" | "monthly"
): HistoricalDataPoint[] {
  if (granularity === "daily") {
    // Already daily, just return sorted
    return [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const aggregated = new Map<string, { date: Date; demand: number; count: number; customer: string; product: string; unitOfMeasure: string }>();

  for (const point of data) {
    let key: string;
    const date = new Date(point.date);

    if (granularity === "weekly") {
      // Get week start (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      key = weekStart.toISOString().split('T')[0];
    } else {
      // Monthly
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        date: granularity === "weekly" ? new Date(key) : new Date(date.getFullYear(), date.getMonth(), 1),
        demand: 0,
        count: 0,
        customer: point.customer,
        product: point.product,
        unitOfMeasure: point.unitOfMeasure
      });
    }

    const agg = aggregated.get(key)!;
    agg.demand += point.demand;
    agg.count += 1;
  }

  return Array.from(aggregated.values())
    .map(agg => ({
      date: agg.date,
      demand: agg.demand, // Sum of demands in the period
      customer: agg.customer,
      product: agg.product,
      unitOfMeasure: agg.unitOfMeasure
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Main forecasting function
export function generateForecasts(
  historicalData: HistoricalDataPoint[],
  forecastPeriods: number,
  selectedModels: string[],
  modelParams: Record<string, any> = {},
  granularity: "daily" | "weekly" | "monthly" = "monthly"
): ForecastResult[] {
  if (historicalData.length === 0) return [];
  
  // Aggregate data by granularity
  const aggregatedData = aggregateDataByGranularity(historicalData, granularity);
  
  // Sort data by date
  const sortedData = aggregatedData;
  
  // Extract demand values
  const demandValues = sortedData.map(d => d.demand);
  
  // Split data for validation (use last 20% for MAPE calculation)
  const splitIndex = Math.floor(demandValues.length * 0.8);
  const trainData = demandValues.slice(0, splitIndex);
  const testData = demandValues.slice(splitIndex);
  const testPeriods = testData.length;
  
  const results: ForecastResult[] = [];
  const lastDate = sortedData[sortedData.length - 1].date;
  
  // Generate forecasts for each selected model
  for (const modelId of selectedModels) {
    let predictions: number[] = [];
    let testPredictions: number[] = [];
    const params = modelParams[modelId] || {};
    
    switch (modelId) {
      case "moving_average":
        predictions = movingAverageForecasting(demandValues, forecastPeriods, params.window || 3);
        testPredictions = movingAverageForecasting(trainData, testPeriods, params.window || 3);
        break;
      case "exponential_smoothing":
        predictions = exponentialSmoothingForecasting(demandValues, forecastPeriods, params.alpha || 0.3);
        testPredictions = exponentialSmoothingForecasting(trainData, testPeriods, params.alpha || 0.3);
        break;
      case "linear_regression":
        predictions = linearRegressionForecasting(demandValues, forecastPeriods);
        testPredictions = linearRegressionForecasting(trainData, testPeriods);
        break;
      case "seasonal_naive":
        predictions = seasonalNaiveForecasting(demandValues, forecastPeriods, params.seasonLength || 12);
        testPredictions = seasonalNaiveForecasting(trainData, testPeriods, params.seasonLength || 12);
        break;
      case "weighted_moving_average":
        predictions = weightedMovingAverageForecasting(demandValues, forecastPeriods, params.window || 3);
        testPredictions = weightedMovingAverageForecasting(trainData, testPeriods, params.window || 3);
        break;
      case "holt_winters":
        predictions = holtWintersForecasting(
          demandValues, 
          forecastPeriods, 
          params.alpha || 0.3, 
          params.beta || 0.1, 
          params.gamma || 0.1,
          params.seasonLength || 12
        );
        testPredictions = holtWintersForecasting(
          trainData, 
          testPeriods, 
          params.alpha || 0.3, 
          params.beta || 0.1, 
          params.gamma || 0.1,
          params.seasonLength || 12
        );
        break;
      case "random_forest":
        predictions = randomForestForecasting(demandValues, forecastPeriods, params.nTrees || 10, params.windowSize || 5);
        testPredictions = randomForestForecasting(trainData, testPeriods, params.nTrees || 10, params.windowSize || 5);
        break;
      case "arima":
        predictions = arimaForecasting(demandValues, forecastPeriods, params.p || 2, params.d || 1, params.q || 2);
        testPredictions = arimaForecasting(trainData, testPeriods, params.p || 2, params.d || 1, params.q || 2);
        break;
    }
    
    // Calculate MAPE
    const mape = testData.length > 0 ? calculateMAPE(testData, testPredictions) : 0;
    
    // Generate forecast dates based on granularity
    const forecastData = predictions.map((predicted, index) => {
      const forecastDate = new Date(lastDate);
      
      if (granularity === "daily") {
        forecastDate.setDate(forecastDate.getDate() + index + 1);
      } else if (granularity === "weekly") {
        forecastDate.setDate(forecastDate.getDate() + (index + 1) * 7);
      } else {
        forecastDate.setMonth(forecastDate.getMonth() + index + 1);
      }
      
      return {
        date: forecastDate,
        predicted
      };
    });
    
    const model = FORECASTING_MODELS.find(m => m.id === modelId);
    
    results.push({
      modelId,
      modelName: model?.name || modelId,
      predictions: forecastData,
      mape,
      isRecommended: false
    });
  }
  
  // Mark the model with lowest MAPE as recommended
  if (results.length > 0) {
    const bestModel = results.reduce((best, current) => 
      current.mape < best.mape ? current : best
    );
    bestModel.isRecommended = true;
  }
  
  return results;
}
