export interface BusinessSnapshotData {
  timeRange: string;
  revenue: number;
  previousRevenue: number;
  revenueGrowth: number;
  orders: number;
  previousOrders: number;
  ordersGrowth: number;
  aov: number;
  previousAov: number;
  topProducts: Array<{ name: string; category: string; revenue: number; quantity: number }>;
  inventoryRisks: {
    totalProducts: number;
    outOfStockCount: number;
    criticalCount: number;
    highRiskCount: number;
  };
  reviewsSummary: {
    averageRating: number;
    totalReviews: number;
    negativeReviewsCount: number;
    lowestRatedProducts: Array<{ name: string; averageRating: number }>;
  };
}

export function buildBusinessAdvisorPrompt(snapshot: BusinessSnapshotData): {
  systemInstruction: string;
  userPrompt: string;
} {
  const systemInstruction =
    'You are a Senior E-Commerce Growth Consultant and Retail Operations Advisor. Your objective is to evaluate merchant business data, compute an accurate health score (0 to 100), provide a clear executive summary, identify core business strengths, call out operational and inventory risks, and generate actionable recommendations. Ground all observations strictly in the provided numerical snapshot metrics; explicitly cite figures such as revenue totals, growth percentages, order counts, stockout risks, and rating statistics.';

  const topProdList = snapshot.topProducts
    .map((p, i) => `${i + 1}. ${p.name} (${p.category}): $${p.revenue.toLocaleString()} revenue (${p.quantity} units)`)
    .join('\n');

  const lowestRatedList = snapshot.reviewsSummary.lowestRatedProducts
    .map((p) => `- ${p.name}: ${p.averageRating.toFixed(1)}/5 stars`)
    .join('\n');

  const userPrompt = `Analyze the following store performance snapshot over the past ${snapshot.timeRange}:

=== DETERMINISTIC BUSINESS METRICS ===
- Period: Last ${snapshot.timeRange}
- Total Gross Revenue: $${snapshot.revenue.toLocaleString()} (vs Previous: $${snapshot.previousRevenue.toLocaleString()} | Growth: ${snapshot.revenueGrowth > 0 ? '+' : ''}${snapshot.revenueGrowth.toFixed(1)}%)
- Total Order Volume: ${snapshot.orders.toLocaleString()} (vs Previous: ${snapshot.previousOrders.toLocaleString()} | Growth: ${snapshot.ordersGrowth > 0 ? '+' : ''}${snapshot.ordersGrowth.toFixed(1)}%)
- Average Order Value (AOV): $${snapshot.aov.toFixed(2)} (vs Previous: $${snapshot.previousAov.toFixed(2)})

=== TOP PERFORMING PRODUCTS ===
${topProdList || 'No sales recorded'}

=== INVENTORY RISK SUMMARY ===
- Total Products Monitored: ${snapshot.inventoryRisks.totalProducts}
- Out-of-Stock Items: ${snapshot.inventoryRisks.outOfStockCount}
- Critical Stockout Warning (0–3 days left): ${snapshot.inventoryRisks.criticalCount}
- High Stockout Risk (4–7 days left): ${snapshot.inventoryRisks.highRiskCount}

=== CUSTOMER REVIEWS & REPUTATION ===
- Storewide Average Rating: ${snapshot.reviewsSummary.averageRating.toFixed(1)} / 5.0 stars
- Total Customer Reviews: ${snapshot.reviewsSummary.totalReviews}
- Critical/Negative Reviews (1–2 stars): ${snapshot.reviewsSummary.negativeReviewsCount}
- Lowest Rated Products:
${lowestRatedList || 'All products healthy'}

Please generate a comprehensive Business Advisor Report containing:
1. Store Health Score (0–100 scale based on overall growth, inventory stability, and customer satisfaction).
2. Executive Summary.
3. Strengths & Growth Drivers (cites revenue/order/product metrics).
4. Operational & Stockout Risks (cites stockout risks or review complaints).
5. Recommended Action Items with priority ('high', 'medium', 'low'), action details, expected impact, and category.`;

  return { systemInstruction, userPrompt };
}
