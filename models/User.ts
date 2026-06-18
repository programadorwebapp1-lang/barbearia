import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "BARBEIRO", "CLIENTE"], required: true },
    barberId: { type: Schema.Types.ObjectId, ref: "Barber", default: null },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof UserSchema>;

export default models.User || model("User", UserSchema);
