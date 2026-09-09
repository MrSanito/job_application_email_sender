export interface Lead {
  id: string;
  name: string;
  email: string;
  catName?: string;
  company?: string;
  address?: string;
  phone?: string;
  website?: string;
  status: 'valid' | 'invalid' | 'duplicate';
  customFields?: Record<string, string>;
}

export interface BatchTiming {
  batchNumber: number;
  startTime: string; // "09:00"
  endTime: string;   // "12:00"
}

export interface CampaignConfig {
  campaignName: string;
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  subjectTemplate: string;
  bodyTemplate: string;
  emailsPerDay: number;
  intervalSeconds: number;
  intervalJitterSeconds: number; // e.g. 10s random variation
  batchesPerDay: number;
  batchTimings: BatchTiming[];
  workDaysOnly: boolean; // Mon-Fri only
  startDate?: string;
  customInstructions?: string;
  candidateName?: string;
  candidateRole?: string;
  candidateSkills?: string;
  candidatePortfolio?: string;
}

export interface BatchPreview {
  batchNumber: number;
  timeWindow: string;
  emailCount: number;
  leadRange: string;
  estimatedStartTime: string;
}

export interface DaySchedulePreview {
  dayNumber: number;
  dateStr: string;
  dayOfWeek: string;
  isWorkDay: boolean;
  batches: BatchPreview[];
  dailyTotal: number;
}

export interface CampaignCalculation {
  totalLeads: number;
  validLeads: number;
  invalidLeads: number;
  emailsPerDay: number;
  emailsPerBatch: number;
  totalBatches: number;
  totalDaysToRun: number;
  workDaysCount: number;
  estimatedEndDate: string;
  dailyActiveSendingMinutes: number;
  averageIntervalSeconds: number;
  deliverabilityScore: 'Optimal' | 'Good' | 'High Volume' | 'Aggressive';
  deliverabilityAdvice: string;
  schedulePreview: DaySchedulePreview[];
}

export interface QueueJob {
  id: string;
  campaignId: string;
  leadId: string;
  lead: Lead;
  subject: string;
  bodyHtml: string;
  dayNumber: number;
  batchNumber: number;
  scheduledTime: string; // ISO string
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'simulated';
  sentAt?: string;
  error?: string;
  qStashMessageId?: string;
  durationMs?: number;
  isAiGenerated?: boolean;
  modelUsed?: string;
}

export interface CampaignState {
  id: string;
  name: string;
  createdAt: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  config: CampaignConfig;
  leads: Lead[];
  calculation: CampaignCalculation;
  jobs: QueueJob[];
  stats: {
    total: number;
    queued: number;
    processing: number;
    sent: number;
    failed: number;
    simulated: number;
  };
}

export interface AppSettings {
  qstashToken: string;
  qstashCurrentSigningKey?: string;
  qstashNextSigningKey?: string;
  upstashRedisUrl: string;
  upstashRedisToken: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  isSimulationMode: boolean;
  webhookBaseUrl: string;
}
