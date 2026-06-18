import { Schema, model, models, type InferSchemaType } from "mongoose";

const ServiceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 5, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Service = InferSchemaType<typeof ServiceSchema>;

export default models.Service || model("Service", ServiceSchema);
