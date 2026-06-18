import { Schema, model, models, type InferSchemaType } from "mongoose";

const ClientSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    birthDate: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ClientSchema.index({ email: 1 });
ClientSchema.index({ active: 1 });

export type Client = InferSchemaType<typeof ClientSchema>;

export default models.Client || model("Client", ClientSchema);
