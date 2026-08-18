import { HydratedDocument, InferSchemaType, Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['merchant', 'admin'], default: 'merchant', required: true },
  },
  { timestamps: true },
);

const User = model('User', userSchema);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export default User;
