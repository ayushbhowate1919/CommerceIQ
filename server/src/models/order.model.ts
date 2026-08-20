import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNumber: { type: String, required: true, trim: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: { type: [orderItemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, trim: true },
    paymentStatus: { type: String, required: true, trim: true },
    orderDate: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

const Order = model('Order', orderSchema);

export type OrderDocument = HydratedDocument<InferSchemaType<typeof orderSchema>>;

export default Order;

