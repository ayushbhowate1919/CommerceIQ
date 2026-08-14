import { Schema, model } from 'mongoose';

const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true },
    verifiedPurchase: { type: Boolean, default: false },
    aiAnalysis: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
);

const Review = model('Review', reviewSchema);

export default Review;
