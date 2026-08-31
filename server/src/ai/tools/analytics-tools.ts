import { FunctionDeclaration, Type } from '@google/genai';
import {
  getCategoryRevenue,
  getDashboardSummary,
  getOrderSummary,
  getPeriodComparison,
  getProductPerformance,
  getRevenueTrend,
  getTopProducts,
} from '../../services/analytics.service.js';
import { getInventoryRisks } from '../../services/inventory.service.js';
import { validateAnalyticsQuery } from '../../validators/analytics.validator.js';
import { validateInventoryQuery } from '../../validators/inventory.validator.js';

export const getRevenueSummaryDeclaration: FunctionDeclaration = {
  name: 'get_revenue_summary',
  description:
    'Retrieves key revenue metrics, order volume, Average Order Value (AOV), total units sold, and period-over-period percentage changes for the store over a specified time window.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d' (last 7 days), '30d' (last 30 days), '90d' (last 90 days), or '12m' (last 12 months). Default is '30d'.",
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD). If provided, endDate should also be supplied.',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD). If provided, startDate should also be supplied.',
      },
    },
  },
};

export const getTopProductsDeclaration: FunctionDeclaration = {
  name: 'get_top_products',
  description:
    'Retrieves the top-performing products ranked by gross revenue generated or total quantity sold over a specified time window.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.NUMBER,
        description: 'Number of top products to return (between 1 and 20). Default is 5.',
      },
      sortBy: {
        type: Type.STRING,
        description: "Metric to rank products by: 'revenue' or 'quantity'. Default is 'revenue'.",
      },
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d', '30d', '90d', or '12m'. Default is '30d'.",
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD).',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD).',
      },
    },
  },
};

export const getRevenueByCategoryDeclaration: FunctionDeclaration = {
  name: 'get_revenue_by_category',
  description:
    'Retrieves revenue breakdown, total quantity sold, order volume, and percentage share of total sales grouped by product category over a specified time window.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d', '30d', '90d', or '12m'. Default is '30d'.",
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD).',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD).',
      },
    },
  },
};

export const getSalesTrendDeclaration: FunctionDeclaration = {
  name: 'get_sales_trend',
  description:
    'Retrieves historical time-series sales trend data points (revenue, order volume, AOV) grouped by day, week, or month over a specified date range.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d', '30d', '90d', or '12m'. Default is '30d'.",
      },
      interval: {
        type: Type.STRING,
        description: "Time interval grouping: 'day', 'week', or 'month'.",
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD).',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD).',
      },
    },
  },
};

export const getInventoryRiskDeclaration: FunctionDeclaration = {
  name: 'get_inventory_risk',
  description:
    'Retrieves store inventory risk analysis, highlighting out-of-stock items, critical stockout warnings (0–3 days left), high stockout risks (4–7 days left), estimated daily sales, and suggested reorder quantities.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      lookbackDays: {
        type: Type.NUMBER,
        description: 'Number of lookback days for calculating sales velocity (7, 14, 30, 60, 90). Default is 30.',
      },
      riskLevel: {
        type: Type.STRING,
        description: "Filter by stockout risk severity: 'critical', 'high', 'medium', or 'healthy'.",
      },
      reorderOnly: {
        type: Type.BOOLEAN,
        description: 'If true, returns only products where stock is below reorder level or facing stockout risk.',
      },
      category: {
        type: Type.STRING,
        description: 'Optional category name filter.',
      },
      search: {
        type: Type.STRING,
        description: 'Optional product name or SKU search term.',
      },
    },
  },
};

export const getProductPerformanceDeclaration: FunctionDeclaration = {
  name: 'get_product_performance',
  description:
    'Retrieves detailed product sales performance including units sold, gross revenue, stock level, customer rating, and review count for catalog products.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d', '30d', '90d', or '12m'. Default is '30d'.",
      },
      category: {
        type: Type.STRING,
        description: 'Optional category filter.',
      },
      search: {
        type: Type.STRING,
        description: 'Optional product name or SKU search query.',
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD).',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD).',
      },
    },
  },
};

export const getOrderSummaryDeclaration: FunctionDeclaration = {
  name: 'get_order_summary',
  description:
    'Retrieves store order metrics including gross revenue, net revenue (excluding cancelled orders), total order volume, and status count breakdown (delivered, shipped, pending, cancelled, returned).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d', '30d', '90d', or '12m'. Default is '30d'.",
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD).',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD).',
      },
    },
  },
};

export const getPeriodComparisonDeclaration: FunctionDeclaration = {
  name: 'get_period_comparison',
  description:
    'Retrieves comparative side-by-side performance metrics comparing the current date window to the preceding period of identical duration.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Preset date range: '7d', '30d', '90d', or '12m'. Default is '30d'.",
      },
      startDate: {
        type: Type.STRING,
        description: 'Custom start date in ISO format (YYYY-MM-DD).',
      },
      endDate: {
        type: Type.STRING,
        description: 'Custom end date in ISO format (YYYY-MM-DD).',
      },
    },
  },
};

export const ALL_ANALYTICS_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  getRevenueSummaryDeclaration,
  getTopProductsDeclaration,
  getRevenueByCategoryDeclaration,
  getSalesTrendDeclaration,
  getInventoryRiskDeclaration,
  getProductPerformanceDeclaration,
  getOrderSummaryDeclaration,
  getPeriodComparisonDeclaration,
];

// Alias for backwards compatibility
export const MILESTONE_13_TOOL_DECLARATIONS = ALL_ANALYTICS_TOOL_DECLARATIONS;

export interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  output: unknown;
}

export async function executeAnalyticsTool(
  merchantId: string,
  toolName: string,
  rawArgs: Record<string, unknown>,
): Promise<ToolCallResult> {
  const safeArgs = rawArgs ?? {};

  try {
    let output: unknown;

    switch (toolName) {
      case 'get_revenue_summary': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getDashboardSummary(merchantId, validated);
        break;
      }

      case 'get_top_products': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getTopProducts(merchantId, validated);
        break;
      }

      case 'get_revenue_by_category': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getCategoryRevenue(merchantId, validated);
        break;
      }

      case 'get_sales_trend': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getRevenueTrend(merchantId, validated);
        break;
      }

      case 'get_inventory_risk': {
        const validated = validateInventoryQuery(safeArgs);
        output = await getInventoryRisks(merchantId, validated);
        break;
      }

      case 'get_product_performance': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getProductPerformance(merchantId, validated);
        break;
      }

      case 'get_order_summary': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getOrderSummary(merchantId, validated);
        break;
      }

      case 'get_period_comparison': {
        const validated = validateAnalyticsQuery(safeArgs);
        output = await getPeriodComparison(merchantId, validated);
        break;
      }

      default:
        return {
          toolName,
          args: safeArgs,
          output: {
            success: false,
            error: `Unknown tool name '${toolName}'. Supported tools: ${ALL_ANALYTICS_TOOL_DECLARATIONS.map((t) => t.name).join(', ')}.`,
          },
        };
    }

    return {
      toolName,
      args: safeArgs,
      output,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid tool parameters.';
    return {
      toolName,
      args: safeArgs,
      output: {
        success: false,
        error: `Tool execution failed: ${message}`,
      },
    };
  }
}

