import { ApiError } from '../utils/api-error.js';

export type AnalyticsRange = '7d' | '30d' | '90d' | '12m';
export type AnalyticsInterval = 'day' | 'week' | 'month';
export type SortByOption = 'revenue' | 'quantity';

export interface AnalyticsQueryInput {
  range?: AnalyticsRange;
  startDate?: string;
  endDate?: string;
  interval?: AnalyticsInterval;
  limit?: number;
  sortBy?: SortByOption;
}

export interface DateWindow {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}

export function validateAnalyticsQuery(rawQuery: Record<string, unknown>): AnalyticsQueryInput {
  const query: AnalyticsQueryInput = {};

  if (rawQuery.range !== undefined) {
    if (typeof rawQuery.range !== 'string' || !['7d', '30d', '90d', '12m'].includes(rawQuery.range)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid range option. Allowed: 7d, 30d, 90d, 12m.');
    }
    query.range = rawQuery.range as AnalyticsRange;
  }

  if (rawQuery.startDate !== undefined) {
    if (typeof rawQuery.startDate !== 'string' || Number.isNaN(Date.parse(rawQuery.startDate))) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid startDate format.');
    }
    query.startDate = rawQuery.startDate;
  }

  if (rawQuery.endDate !== undefined) {
    if (typeof rawQuery.endDate !== 'string' || Number.isNaN(Date.parse(rawQuery.endDate))) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid endDate format.');
    }
    query.endDate = rawQuery.endDate;
  }

  if (query.startDate && query.endDate) {
    if (new Date(query.startDate) > new Date(query.endDate)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'startDate cannot be after endDate.');
    }
  }

  if (rawQuery.interval !== undefined) {
    if (typeof rawQuery.interval !== 'string' || !['day', 'week', 'month'].includes(rawQuery.interval)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid interval. Allowed: day, week, month.');
    }
    query.interval = rawQuery.interval as AnalyticsInterval;
  }

  if (rawQuery.limit !== undefined) {
    const limitNum = Number(rawQuery.limit);
    if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'limit must be a number between 1 and 50.');
    }
    query.limit = Math.floor(limitNum);
  }

  if (rawQuery.sortBy !== undefined) {
    if (typeof rawQuery.sortBy !== 'string' || !['revenue', 'quantity'].includes(rawQuery.sortBy)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid sortBy. Allowed: revenue, quantity.');
    }
    query.sortBy = rawQuery.sortBy as SortByOption;
  }

  return query;
}

export function parseDateWindow(query: AnalyticsQueryInput, referenceDate: Date = new Date()): DateWindow {
  let currentEnd: Date;
  let currentStart: Date;

  if (query.endDate) {
    currentEnd = new Date(query.endDate);
  } else {
    currentEnd = new Date(referenceDate);
  }

  if (query.startDate) {
    currentStart = new Date(query.startDate);
  } else {
    const range = query.range ?? '30d';
    currentStart = new Date(currentEnd);
    if (range === '7d') {
      currentStart.setDate(currentStart.getDate() - 7);
    } else if (range === '30d') {
      currentStart.setDate(currentStart.getDate() - 30);
    } else if (range === '90d') {
      currentStart.setDate(currentStart.getDate() - 90);
    } else if (range === '12m') {
      currentStart.setDate(currentStart.getDate() - 365);
    }
  }

  const durationMs = Math.max(currentEnd.getTime() - currentStart.getTime(), 86400000);
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
  };
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
}
