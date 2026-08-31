import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import { calculateProductRisk } from '../src/services/inventory.service.js';
import type { ProductDocument } from '../src/models/product.model.js';
import { calculatePercentageChange, parseDateWindow, validateAnalyticsQuery } from '../src/validators/analytics.validator.js';
import { validateInventoryQuery } from '../src/validators/inventory.validator.js';
import { validateReviewQuery } from '../src/validators/review.validator.js';
import {
  validateAnalyticsQueryInput,
  validateGenerateDescriptionInput,
  validateSingleReviewAnalysisInput,
} from '../src/validators/ai.validator.js';

function mockProduct(stock: number, reorderLevel = 10): ProductDocument {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Product',
    sku: 'TEST-SKU-001',
    category: 'Electronics',
    price: 100,
    costPrice: 50,
    stock,
    reorderLevel,
  } as unknown as ProductDocument;
}

describe('Milestone 18 — Unit Tests', () => {
  describe('Inventory Calculation Heuristics', () => {
    it('calculates critical risk (0-3 days remaining)', () => {
      // Stock = 20, 100 sold over 10 days => Daily sales = 10 => 2 days stockout (Critical)
      const p1 = mockProduct(20);
      const risk1 = calculateProductRisk(p1, 100, 10);
      assert.equal(risk1.estimatedDaysUntilStockout, 2);
      assert.equal(risk1.riskLevel, 'critical');
      assert.equal(risk1.reorderNeeded, true);

      // Stock = 0 => 0 days stockout (Critical)
      const p2 = mockProduct(0);
      const risk2 = calculateProductRisk(p2, 50, 10);
      assert.equal(risk2.estimatedDaysUntilStockout, 0);
      assert.equal(risk2.riskLevel, 'critical');
      assert.equal(risk2.reorderNeeded, true);
    });

    it('calculates high risk (4-7 days remaining)', () => {
      // Stock = 50, 100 sold over 10 days => Daily sales = 10 => 5 days stockout (High)
      const p = mockProduct(50);
      const risk = calculateProductRisk(p, 100, 10);
      assert.equal(risk.estimatedDaysUntilStockout, 5);
      assert.equal(risk.riskLevel, 'high');
      assert.equal(risk.reorderNeeded, true);
    });

    it('calculates medium risk (8-14 days remaining)', () => {
      // Stock = 100, 100 sold over 10 days => Daily sales = 10 => 10 days stockout (Medium)
      const p = mockProduct(100);
      const risk = calculateProductRisk(p, 100, 10);
      assert.equal(risk.estimatedDaysUntilStockout, 10);
      assert.equal(risk.riskLevel, 'medium');
      assert.equal(risk.reorderNeeded, false);
    });

    it('calculates healthy risk (15+ days or 0 daily sales)', () => {
      // Stock = 200, 100 sold over 10 days => Daily sales = 10 => 20 days stockout (Healthy)
      const p1 = mockProduct(200);
      const risk1 = calculateProductRisk(p1, 100, 10);
      assert.equal(risk1.estimatedDaysUntilStockout, 20);
      assert.equal(risk1.riskLevel, 'healthy');
      assert.equal(risk1.reorderNeeded, false);

      // Stock = 50, 0 sales => null stockout days (Healthy)
      const p2 = mockProduct(50, 10);
      const risk2 = calculateProductRisk(p2, 0, 10);
      assert.equal(risk2.estimatedDaysUntilStockout, null);
      assert.equal(risk2.riskLevel, 'healthy');
      assert.equal(risk2.reorderNeeded, false);
    });
  });

  describe('Percentage Change Math', () => {
    it('computes positive percentage growth correctly', () => {
      assert.equal(calculatePercentageChange(115, 100), 15);
      assert.equal(calculatePercentageChange(200, 100), 100);
    });

    it('computes negative percentage decline correctly', () => {
      assert.equal(calculatePercentageChange(80, 100), -20);
      assert.equal(calculatePercentageChange(50, 100), -50);
    });

    it('handles zero previous value edge case', () => {
      assert.equal(calculatePercentageChange(50, 0), 100);
      assert.equal(calculatePercentageChange(0, 0), 0);
    });
  });

  describe('Analytics Date Window Helpers', () => {
    it('parses preset range 30d relative to reference date', () => {
      const refDate = new Date('2026-09-01T00:00:00.000Z');
      const window = parseDateWindow({ range: '30d' }, refDate);

      assert.equal(window.currentEnd.toISOString(), refDate.toISOString());
      const expectedStart = new Date(refDate);
      expectedStart.setDate(expectedStart.getDate() - 30);
      assert.equal(window.currentStart.toISOString(), expectedStart.toISOString());
    });

    it('parses custom start and end date bounds', () => {
      const window = parseDateWindow({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T00:00:00.000Z',
      });

      assert.equal(window.currentStart.toISOString(), '2026-01-01T00:00:00.000Z');
      assert.equal(window.currentEnd.toISOString(), '2026-01-31T00:00:00.000Z');
    });
  });

  describe('Tool & Endpoint Input Validators', () => {
    it('validates analytics query inputs correctly', () => {
      const valid = validateAnalyticsQuery({ range: '90d', limit: 10, sortBy: 'revenue' });
      assert.equal(valid.range, '90d');
      assert.equal(valid.limit, 10);
      assert.equal(valid.sortBy, 'revenue');

      assert.throws(() => validateAnalyticsQuery({ range: 'invalid_range' }), /Invalid range option/);
      assert.throws(() => validateAnalyticsQuery({ limit: 100 }), /limit must be a number between 1 and 50/);
    });

    it('validates inventory query inputs correctly', () => {
      const valid = validateInventoryQuery({ lookbackDays: 60, riskLevel: 'critical', reorderOnly: true });
      assert.equal(valid.lookbackDays, 60);
      assert.equal(valid.riskLevel, 'critical');
      assert.equal(valid.reorderOnly, true);

      assert.throws(() => validateInventoryQuery({ lookbackDays: 500 }), /lookbackDays must be a number between 1 and 365/);
    });

    it('validates review query inputs correctly', () => {
      const valid = validateReviewQuery({ rating: 5, page: 2, limit: 10 });
      assert.equal(valid.rating, 5);
      assert.equal(valid.page, 2);
      assert.equal(valid.limit, 10);

      assert.throws(() => validateReviewQuery({ rating: 6 }), /rating must be an integer between 1 and 5/);
    });

    it('validates AI description & review analysis inputs', () => {
      const validDesc = validateGenerateDescriptionInput({ name: '  Smart Watch  ', category: 'Electronics' });
      assert.equal(validDesc.name, 'Smart Watch');
      assert.equal(validDesc.category, 'Electronics');

      assert.throws(() => validateGenerateDescriptionInput({ name: 'A' }), /Product name must be between 2 and 150 characters/);

      const validRev = validateSingleReviewAnalysisInput({ reviewId: '507f1f77bcf86cd799439011' });
      assert.equal(validRev.reviewId, '507f1f77bcf86cd799439011');

      assert.throws(() => validateSingleReviewAnalysisInput({ reviewId: '123' }), /A valid 24-character hex reviewId is required/);

      const validQuery = validateAnalyticsQueryInput({ query: 'What are top products?' });
      assert.equal(validQuery.query, 'What are top products?');

      assert.throws(() => validateAnalyticsQueryInput({ query: '  ' }), /A non-empty analytics query string is required/);
    });
  });
});
