import mongoose, { Schema, Document, Model } from 'mongoose';
import { QueueJob } from '@/types';

export interface IEmailLog extends Document {
  id: string;
  campaignId: string;
  leadId: string;
  lead: {
    id: string;
    name: string;
    email: string;
    company?: string;
    catName?: string;
    address?: string;
    phone?: string;
    website?: string;
    status: string;
    customFields?: Record<string, string>;
  };
  subject: string;
  bodyHtml: string;
  dayNumber: number;
  batchNumber: number;
  scheduledTime: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'simulated';
  sentAt?: string;
  error?: string;
  qStashMessageId?: string;
  durationMs?: number;
  isAiGenerated?: boolean;
  modelUsed?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    campaignId: { type: String, required: true, index: true },
    leadId: { type: String, required: true },
    lead: {
      id: { type: String, required: true },
      name: { type: String, default: 'Hiring Manager' },
      email: { type: String, required: true, index: true },
      company: { type: String, default: 'Company' },
      catName: { type: String, default: 'Engineering' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      website: { type: String, default: '' },
      status: { type: String, default: 'valid' },
      customFields: { type: Schema.Types.Mixed, default: {} },
    },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    dayNumber: { type: Number, default: 1 },
    batchNumber: { type: Number, default: 1 },
    scheduledTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'sent', 'failed', 'simulated'],
      default: 'queued',
      index: true,
    },
    sentAt: { type: String, default: null },
    error: { type: String, default: null },
    qStashMessageId: { type: String, default: null },
    durationMs: { type: Number, default: null },
    isAiGenerated: { type: Boolean, default: false },
    modelUsed: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const EmailLog: Model<IEmailLog> =
  mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
