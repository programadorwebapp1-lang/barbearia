import { Schema, model, models, type InferSchemaType } from "mongoose";

const PaymentSchema = new Schema(
  {
    type: { type: String, enum: ["service_booking", "product_order"], required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    orderId: { type: Schema.Types.ObjectId, ref: "ProductOrder", default: null },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    barbershopId: { type: Schema.Types.ObjectId, ref: "Barbershop", default: null },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["pix", "cash", "card", "external_pix"], required: true, default: "pix" },
    provider: { type: String, enum: ["mercadopago", "manual"], required: true, default: "mercadopago" },
    providerPaymentId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "expired", "refunded"],
      default: "pending",
    },
    qrCode: { type: String, default: "" },
    qrCodeBase64: { type: String, default: "" },
    pixCopyPaste: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    confirmedByName: { type: String, default: "" },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ clientId: 1, createdAt: -1 });

export type Payment = InferSchemaType<typeof PaymentSchema>;

export default models.Payment || model("Payment", PaymentSchema);
