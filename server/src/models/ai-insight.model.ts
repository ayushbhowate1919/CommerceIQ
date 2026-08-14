import { Schema, model } from 'mongoose';

const aiInsightSchema = new Schema(
  {
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    severity: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    supportingMetrics: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const AIInsight = model('AIInsight', aiInsightSchema);

export default AIInsight;
