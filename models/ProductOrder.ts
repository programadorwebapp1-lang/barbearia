import { Schema, model, models, type InferSchemaType } from "mongoose";

const ProductOrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ProductOrderSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    barbershopId: { type: Schema.Types.ObjectId, ref: "Barbershop", default: null },
    items: { type: [ProductOrderItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "separating", "delivered", "cancelled"],
      default: "pending",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
  },
  { timestamps: true }
);

ProductOrderSchema.index({ clientId: 1, createdAt: -1 });
ProductOrderSchema.index({ paymentStatus: 1, status: 1 });

export type ProductOrder = InferSchemaType<typeof ProductOrderSchema>;

export default models.ProductOrder || model("ProductOrder", ProductOrderSchema);
