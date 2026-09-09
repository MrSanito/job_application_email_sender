import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICampaign extends Document {
  id: string;
  name: string;
  createdAt: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  config: Record<string, unknown>;
  calculation: Record<string, unknown>;
  stats: {
    total: number;
    queued: number;
    processing: number;
    sent: number;
    failed: number;
    simulated: number;
  };
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed'],
      default: 'running',
      index: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
    calculation: { type: Schema.Types.Mixed, default: {} },
    stats: {
      total: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      processing: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      simulated: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);
