import { Schema, model } from 'mongoose';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    reorderLevel: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    status: { type: String, default: 'active', trim: true },
  },
  { timestamps: true },
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ category: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ createdAt: -1 });

const Product = model('Product', productSchema);

export default Product;
