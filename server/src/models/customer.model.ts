import { Schema, model } from 'mongoose';

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    city: { type: String, default: '', trim: true },
    segment: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

const Customer = model('Customer', customerSchema);

export default Customer;
