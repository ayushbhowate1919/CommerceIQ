import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';

const aiInsightSchema = new Schema(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    severity: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    supportingMetrics: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiInsightSchema.index({ merchant: 1, createdAt: -1 });

const AIInsight = model('AIInsight', aiInsightSchema);

export type AIInsightDocument = HydratedDocument<InferSchemaType<typeof aiInsightSchema>>;

export default AIInsight;
