import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';

const customerSchema = new Schema(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, default: '', trim: true },
    segment: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

customerSchema.index({ createdAt: -1 });

const Customer = model('Customer', customerSchema);

export type CustomerDocument = HydratedDocument<InferSchemaType<typeof customerSchema>>;

export default Customer;

