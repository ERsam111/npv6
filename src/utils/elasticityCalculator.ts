import { Scenario3Input, Scenario3EnrichedInput, Scenario3Output } from "@/types/scenario3";

/**
 * Calculate elasticity-adjusted forecast
 * Formula: adjusted_demand = scenario2_forecast * (1 + elasticity * price_change%)
 */
export function calculateElasticityAdjustment(
  scenario2Forecast: number,
  basePrice: number,
  actualPrice: number,
  elasticity: number,
  promotionFlag: 0 | 1,
  promoUplift: number = 0.05 // Default 5% uplift for promotions
): { adjustedUnits: number; priceChangePercent: number } {
  // Calculate price change percentage
  const priceChangePercent = basePrice !== 0 
    ? (basePrice - actualPrice) / basePrice 
    : 0;

  // Apply elasticity formula
  let adjustedUnits = scenario2Forecast * (1 + elasticity * priceChangePercent);

  // Apply promotion uplift if active
  if (promotionFlag === 1) {
    adjustedUnits = adjustedUnits * (1 + promoUplift);
  }

  return {
    adjustedUnits: Math.max(0, adjustedUnits), // Ensure non-negative
    priceChangePercent
  };
}

/**
 * Calculate recommended price to meet target units
 * This calculation is independent of user-provided discount and shows what discount is needed to hit target
 * Reverse formula: required_price_change% = (target_units / scenario2_forecast - 1) / elasticity
 */
export function calculateTargetRecommendation(
  scenario2Forecast: number,
  basePrice: number,
  elasticity: number,
  targetUnits?: number,
  targetRevenue?: number,
  userProvidedDiscount: number = 0,
  promotionFlag: 0 | 1 = 0,
  promoUplift: number = 0.05
): { recommendedPrice: number; recommendedDiscountPercent: number; notes: string } | null {
  if (!targetUnits && !targetRevenue) {
    return null;
  }

  // If target revenue is provided, convert to target units using base price
  let effectiveTargetUnits = targetUnits;
  if (targetRevenue && !targetUnits) {
    effectiveTargetUnits = targetRevenue / basePrice;
  }

  if (!effectiveTargetUnits || elasticity === 0) {
    return {
      recommendedPrice: basePrice,
      recommendedDiscountPercent: 0,
      notes: "Invalid elasticity or target - no adjustment possible"
    };
  }

  // Calculate required price change to meet target (independent of user's discount)
  // Note: We calculate from baseline scenario2 forecast, not from adjusted forecast
  const requiredPriceChangePercent = (effectiveTargetUnits / scenario2Forecast - 1) / elasticity;
  
  // Calculate recommended price and discount
  const recommendedPrice = basePrice * (1 - requiredPriceChangePercent);
  const recommendedDiscountPercent = requiredPriceChangePercent * 100;

  // Generate notes based on comparison with user's provided discount
  let notes = "";
  if (recommendedPrice < 0) {
    notes = "Target unrealistic - would require negative price";
  } else if (Math.abs(recommendedDiscountPercent) > 50) {
    notes = `Warning: Requires ${Math.abs(recommendedDiscountPercent).toFixed(1)}% ${recommendedDiscountPercent > 0 ? 'discount' : 'price increase'} - may not be feasible`;
  } else if (recommendedDiscountPercent < 0) {
    notes = `Increase price by ${Math.abs(recommendedDiscountPercent).toFixed(1)}% to meet target`;
  } else if (recommendedDiscountPercent === 0) {
    notes = "Target matches forecast - no price change needed";
  } else {
    // Compare with user's discount if provided
    if (userProvidedDiscount > 0) {
      const diff = recommendedDiscountPercent - userProvidedDiscount;
      if (Math.abs(diff) < 1) {
        notes = `Current discount (${userProvidedDiscount.toFixed(1)}%) is optimal for target`;
      } else if (diff > 0) {
        notes = `Need ${recommendedDiscountPercent.toFixed(1)}% discount (${diff.toFixed(1)}% more than current) to meet target`;
      } else {
        notes = `Need ${recommendedDiscountPercent.toFixed(1)}% discount (${Math.abs(diff).toFixed(1)}% less than current) to meet target`;
      }
    } else {
      notes = `Apply ${recommendedDiscountPercent.toFixed(1)}% discount to meet target`;
    }
  }

  return {
    recommendedPrice: Math.max(0, recommendedPrice),
    recommendedDiscountPercent: Math.abs(recommendedDiscountPercent),
    notes
  };
}

/**
 * Process Scenario 3 adjustments for all inputs
 */
export function processScenario3Adjustments(
  inputs: Scenario3EnrichedInput[],
  promoUplift: number = 0.05
): Scenario3Output[] {
  return inputs.map(input => {
    // Calculate adjusted forecast using user's actual price (with their discount)
    const { adjustedUnits, priceChangePercent } = calculateElasticityAdjustment(
      input.scenario2_forecast,
      input.base_price,
      input.actual_price,
      input.elasticity,
      input.promotion_flag,
      promoUplift
    );

    // Calculate recommendation to meet target (independent calculation)
    const recommendation = calculateTargetRecommendation(
      input.scenario2_forecast,
      input.base_price,
      input.elasticity,
      input.target_units,
      input.target_revenue,
      input.discount_rate, // Pass user's discount for comparison
      input.promotion_flag,
      promoUplift
    );

    return {
      product_id: input.product_id,
      product_name: input.product_name,
      period: input.period,
      scenario2_forecast: input.scenario2_forecast,
      base_price: input.base_price,
      actual_price: input.actual_price,
      price_change_percent: priceChangePercent * 100,
      elasticity: input.elasticity,
      promotion_flag: input.promotion_flag,
      discount_rate: input.discount_rate,
      adjusted_forecast_units: adjustedUnits,
      target_units: input.target_units,
      target_revenue: input.target_revenue,
      recommended_price: recommendation?.recommendedPrice,
      recommended_discount_percent: recommendation?.recommendedDiscountPercent,
      notes: recommendation?.notes || "No target set"
    };
  });
}
