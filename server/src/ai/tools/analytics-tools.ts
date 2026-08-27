import { FunctionDeclaration, Type } from '@google/genai';
import {
  getCategoryRevenue,
  getDashboardSummary,
  getTopProducts,
} from '../../services/analytics.service.js';
import { validateAnalyticsQuery } from '../../validators/analytics.validator.js';

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
        description: "Custom start date in ISO format (YYYY-MM-DD). If provided, endDate should also be supplied.",
      },
      endDate: {
        type: Type.STRING,
        description: "Custom end date in ISO format (YYYY-MM-DD). If provided, startDate should also be supplied.",
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

export const MILESTONE_13_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  getRevenueSummaryDeclaration,
  getTopProductsDeclaration,
  getRevenueByCategoryDeclaration,
];

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
  const validatedQuery = validateAnalyticsQuery(rawArgs ?? {});

  let output: unknown;

  switch (toolName) {
    case 'get_revenue_summary':
      output = await getDashboardSummary(merchantId, validatedQuery);
      break;

    case 'get_top_products':
      output = await getTopProducts(merchantId, validatedQuery);
      break;

    case 'get_revenue_by_category':
      output = await getCategoryRevenue(merchantId, validatedQuery);
      break;

    default:
      throw new Error(`Unknown tool name: ${toolName}`);
  }

  return {
    toolName,
    args: rawArgs,
    output,
  };
}
