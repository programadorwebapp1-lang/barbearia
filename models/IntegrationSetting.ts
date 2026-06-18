import { Schema, model, models, type InferSchemaType } from "mongoose";

const IntegrationSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    enabled: { type: Boolean, default: true },
    webhookSecret: { type: String, default: "" },
    mercadopagoAccessTokenEncrypted: { type: String, default: "" },
    mercadopagoRefreshTokenEncrypted: { type: String, default: "" },
    mercadopagoTokenExpiresAt: { type: Date, default: null },
    mercadopagoUserId: { type: String, default: "" },
    mercadopagoPublicKey: { type: String, default: "" },
    mercadopagoLiveMode: { type: Boolean, default: false },
    mercadopagoConnectedAt: { type: Date, default: null },
    mercadopagoConnectionState: { type: String, default: "disconnected" },
    accountEmail: { type: String, default: "" },
    accountName: { type: String, default: "" },
    lastTestStatus: { type: String, default: "" },
    lastTestAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

export type IntegrationSetting = InferSchemaType<typeof IntegrationSettingSchema>;

export default models.IntegrationSetting || model("IntegrationSetting", IntegrationSettingSchema);
