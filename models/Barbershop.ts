import { Schema, model, models, type InferSchemaType } from "mongoose";

const BarbershopSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Barbershop = InferSchemaType<typeof BarbershopSchema>;

export default models.Barbershop || model("Barbershop", BarbershopSchema);
