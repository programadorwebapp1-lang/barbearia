import { Schema, model, models, type InferSchemaType } from "mongoose";

const BookingSchema = new Schema(
  {
    barberId: { type: Schema.Types.ObjectId, ref: "Barber", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    barbershopId: { type: Schema.Types.ObjectId, ref: "Barbershop", default: null },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA", "CANCELADA"],
      default: "AGENDADA",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    notes: { type: String, default: "" },
    rescheduledFrom: {
      appointmentId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
      date: { type: String, default: null },
      time: { type: String, default: null },
    },
    reminderSentAt: { type: Date, default: null },
    reminderLastError: { type: String, default: null },
    reminderPayloadSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BookingSchema.index(
  { barberId: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA"] },
    },
  }
);
BookingSchema.index({ barberId: 1, date: 1 });
BookingSchema.index({ clientId: 1, date: -1 });
BookingSchema.index({ date: 1, status: 1 });

export type Booking = InferSchemaType<typeof BookingSchema>;

export default models.Booking || model("Booking", BookingSchema);
