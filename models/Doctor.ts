import { Schema, model, models, type InferSchemaType } from "mongoose";

const BarberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    servicesIds: { type: [Schema.Types.ObjectId], ref: "Service", default: [] },
    photoUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    status: { type: String, enum: ["ATIVO", "INATIVO"], default: "ATIVO" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BarberSchema.index({ active: 1, status: 1 });
BarberSchema.index({ servicesIds: 1 });
BarberSchema.index({ email: 1 });

export type Barber = InferSchemaType<typeof BarberSchema>;

export default models.Barber || model("Barber", BarberSchema);
