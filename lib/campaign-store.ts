import { CampaignCalculation, CampaignConfig, CampaignState, Lead, QueueJob } from '@/types';
import { connectMongoose } from './mongodb';
import { Campaign } from '@/models/Campaign';
import { EmailLog } from '@/models/EmailLog';
import { getRedisClient } from './upstash';
import { renderTemplate, getRandomSubjectTemplate, ROTATING_SUBJECT_TEMPLATES, DEFAULT_SUBJECT_TEMPLATE } from './template-engine';

// In-memory fallback singleton
declare global {
  // eslint-disable-next-line no-var
  var __jobApplierCampaign: CampaignState | null;
  // eslint-disable-next-line no-var
  var __jobApplierLogs: QueueJob[];
}

if (!global.__jobApplierCampaign) {
  global.__jobApplierCampaign = null;
}
if (!global.__jobApplierLogs) {
  global.__jobApplierLogs = [];
}

export const REDIS_CAMPAIGN_KEY = 'jobapplier:active_campaign';
export const REDIS_LOGS_KEY = 'jobapplier:queue_jobs';

export async function getActiveCampaign(): Promise<CampaignState | null> {
  // 1. Try Mongoose first
  try {
    const conn = await connectMongoose();
    if (conn) {
      const campDoc = await Campaign.findOne({
        status: { $in: ['running', 'paused', 'completed'] },
      })
        .sort({ createdAt: -1 })
        .lean();

      if (campDoc) {
        const logDocs = await EmailLog.find({ campaignId: campDoc.id })
          .sort({ scheduledTime: 1 })
          .lean();

        const mappedJobs: QueueJob[] = logDocs.map((l) => ({
          id: l.id,
          campaignId: l.campaignId,
          leadId: l.leadId,
          lead: {
            id: l.lead.id,
            name: l.lead.name,
            email: l.lead.email,
            company: l.lead.company,
            catName: l.lead.catName,
            address: l.lead.address,
            phone: l.lead.phone,
            website: l.lead.website,
            status: l.lead.status as Lead['status'],
            customFields: l.lead.customFields,
          },
          subject: l.subject,
          bodyHtml: l.bodyHtml,
          dayNumber: l.dayNumber,
          batchNumber: l.batchNumber,
          scheduledTime: l.scheduledTime,
          status: l.status,
          sentAt: l.sentAt || undefined,
          error: l.error || undefined,
          qStashMessageId: l.qStashMessageId || undefined,
          durationMs: l.durationMs || undefined,
          isAiGenerated: l.isAiGenerated,
          modelUsed: l.modelUsed || undefined,
        }));

        return {
          id: campDoc.id,
          name: campDoc.name,
          createdAt: (campDoc as unknown as { createdAt: string }).createdAt || new Date().toISOString(),
          status: campDoc.status,
          config: campDoc.config as unknown as CampaignConfig,
          calculation: campDoc.calculation as unknown as CampaignCalculation,
          leads: mappedJobs.map((j) => j.lead),
          jobs: mappedJobs,
          stats: campDoc.stats || {
            total: mappedJobs.length,
            queued: mappedJobs.filter((j) => j.status === 'queued').length,
            processing: mappedJobs.filter((j) => j.status === 'processing').length,
            sent: mappedJobs.filter((j) => j.status === 'sent').length,
            failed: mappedJobs.filter((j) => j.status === 'failed').length,
            simulated: mappedJobs.filter((j) => j.status === 'simulated').length,
          },
        };
      }
    }
  } catch (mongoErr) {
    console.warn('Mongoose getActiveCampaign error, fallback to Redis/Memory:', mongoErr);
  }

  // 2. Try Redis fallback
  const redis = getRedisClient();
  if (redis) {
    try {
      const data = await redis.get<CampaignState>(REDIS_CAMPAIGN_KEY);
      if (data) return data;
    } catch (e) {
      console.warn('Redis get failed, falling back to memory store:', e);
    }
  }

  // 3. In-memory fallback
  return global.__jobApplierCampaign;
}

export async function saveCampaignState(campaign: CampaignState): Promise<void> {
  global.__jobApplierCampaign = campaign;
  global.__jobApplierLogs = campaign.jobs;

  // 1. Save to Mongoose
  try {
    const conn = await connectMongoose();
    if (conn) {
      await Campaign.findOneAndUpdate(
        { id: campaign.id },
        {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          config: campaign.config,
          calculation: campaign.calculation,
          stats: campaign.stats,
        },
        { upsert: true, returnDocument: 'after' }
      );

      if (campaign.jobs && campaign.jobs.length > 0) {
        const bulkOps = campaign.jobs.map((job) => ({
          updateOne: {
            filter: { id: job.id },
            update: {
              $set: {
                id: job.id,
                campaignId: campaign.id,
                leadId: job.leadId,
                lead: job.lead,
                subject: job.subject,
                bodyHtml: job.bodyHtml,
                dayNumber: job.dayNumber,
                batchNumber: job.batchNumber,
                scheduledTime: job.scheduledTime,
                status: job.status,
                sentAt: job.sentAt || null,
                error: job.error || null,
                qStashMessageId: job.qStashMessageId || null,
                durationMs: job.durationMs || null,
                isAiGenerated: Boolean(job.isAiGenerated),
                modelUsed: job.modelUsed || null,
              },
            },
            upsert: true,
          },
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await EmailLog.bulkWrite(bulkOps as any);
      }
    }
  } catch (mongoErr) {
    console.warn('Mongoose save error, saved in memory/redis:', mongoErr);
  }

  // 2. Save to Redis
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(REDIS_CAMPAIGN_KEY, campaign);
      await redis.set(REDIS_LOGS_KEY, campaign.jobs);
    } catch (e) {
      console.warn('Redis save failed, cached in memory:', e);
    }
  }
}

export async function initializeCampaign(
  name: string,
  leads: Lead[],
  config: CampaignConfig,
  calculation: CampaignCalculation
): Promise<CampaignState> {
  const campaignId = `camp_${Date.now()}`;
  const validLeads = leads.filter((l) => l.status === 'valid' || (l.status !== 'invalid' && Boolean(l.email)));

  // Build queue jobs for each valid lead based on calculation schedule
  const jobs: QueueJob[] = [];
  let leadPointer = 0;

  calculation.schedulePreview.forEach((day) => {
    day.batches.forEach((batch) => {
      let batchDate: Date;
      if (batch.estimatedStartTime && batch.estimatedStartTime.includes(' ')) {
        const [datePart, timePart] = batch.estimatedStartTime.split(' ');
        const [y, m, d] = datePart.split('-').map(Number);
        const [h, min] = timePart.split(':').map(Number);
        batchDate = new Date(y, m - 1, d, h || 9, min || 0, 0, 0);
      } else {
        const [startHour, startMin] = batch.timeWindow.split(' - ')[0].split(':').map(Number);
        let baseStartDate = new Date();
        if (config.startDate) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(config.startDate)) {
            const [y, m, d] = config.startDate.split('-').map(Number);
            baseStartDate = new Date(y, m - 1, d);
          } else {
            const parsed = new Date(config.startDate);
            if (!isNaN(parsed.getTime())) baseStartDate = parsed;
          }
        }
        batchDate = new Date(baseStartDate);
        batchDate.setDate(batchDate.getDate() + (day.dayNumber - 1));
        batchDate.setHours(startHour || 9, startMin || 0, 0, 0);
      }

      for (let i = 0; i < batch.emailCount; i++) {
        if (leadPointer >= validLeads.length) break;
        const lead = validLeads[leadPointer];
        
        const leadOffsetSeconds = i * (config.intervalSeconds || 60);
        const scheduledTime = new Date(batchDate.getTime() + leadOffsetSeconds * 1000);

        // Rotate subject lines dynamically at runtime with Math.random() if using default or rotating template
        const isUsingRotatingTemplate =
          !config.subjectTemplate ||
          config.subjectTemplate === DEFAULT_SUBJECT_TEMPLATE ||
          ROTATING_SUBJECT_TEMPLATES.includes(config.subjectTemplate);

        const subjectTemplateToUse = isUsingRotatingTemplate
          ? getRandomSubjectTemplate()
          : config.subjectTemplate;

        const renderedSubject = renderTemplate(subjectTemplateToUse, lead);
        const renderedBody = renderTemplate(config.bodyTemplate, lead);

        jobs.push({
          id: `job_${campaignId}_${leadPointer + 1}`,
          campaignId,
          leadId: lead.id,
          lead,
          subject: renderedSubject,
          bodyHtml: renderedBody.replace(/\n/g, '<br/>'),
          dayNumber: day.dayNumber,
          batchNumber: batch.batchNumber,
          scheduledTime: scheduledTime.toISOString(),
          status: 'queued',
        });

        leadPointer++;
      }
    });
  });

  const state: CampaignState = {
    id: campaignId,
    name: name || `Campaign ${new Date().toLocaleDateString()}`,
    createdAt: new Date().toISOString(),
    status: 'running',
    config,
    leads,
    calculation,
    jobs,
    stats: {
      total: jobs.length,
      queued: jobs.length,
      processing: 0,
      sent: 0,
      failed: 0,
      simulated: 0,
    },
  };

  await saveCampaignState(state);
  return state;
}

export async function updateJobResult(
  jobId: string,
  status: QueueJob['status'],
  options?: {
    error?: string;
    durationMs?: number;
    messageId?: string;
    subject?: string;
    htmlBody?: string;
    modelUsed?: string;
    isAiGenerated?: boolean;
  }
): Promise<QueueJob | null> {
  const campaign = await getActiveCampaign();
  if (!campaign) return null;

  const jobIndex = campaign.jobs.findIndex((j) => j.id === jobId);
  if (jobIndex === -1) return null;

  const job = campaign.jobs[jobIndex];
  const oldStatus = job.status;

  job.status = status;
  job.sentAt = new Date().toISOString();
  if (options?.error) job.error = options.error;
  if (options?.durationMs) job.durationMs = options.durationMs;
  if (options?.messageId) job.qStashMessageId = options.messageId;
  if (options?.subject) job.subject = options.subject;
  if (options?.htmlBody) job.bodyHtml = options.htmlBody;
  if (options?.modelUsed) job.modelUsed = options.modelUsed;
  if (options?.isAiGenerated !== undefined) job.isAiGenerated = options.isAiGenerated;

  // Update stats
  if (oldStatus !== status) {
    if (campaign.stats[oldStatus] !== undefined && campaign.stats[oldStatus] > 0) {
      campaign.stats[oldStatus]--;
    }
    if (campaign.stats[status] !== undefined) {
      campaign.stats[status]++;
    }
  }

  // Check if all jobs are done
  const pendingCount = campaign.jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;
  if (pendingCount === 0 && campaign.status === 'running') {
    campaign.status = 'completed';
  }

  // Update single job in Mongoose
  try {
    const conn = await connectMongoose();
    if (conn) {
      await EmailLog.findOneAndUpdate(
        { id: jobId },
        {
          $set: {
            status,
            sentAt: job.sentAt,
            error: job.error || null,
            durationMs: job.durationMs || null,
            qStashMessageId: job.qStashMessageId || null,
            subject: job.subject,
            bodyHtml: job.bodyHtml,
            isAiGenerated: Boolean(job.isAiGenerated),
            modelUsed: job.modelUsed || null,
          },
        },
        { upsert: true }
      );

      await Campaign.findOneAndUpdate(
        { id: campaign.id },
        { $set: { stats: campaign.stats, status: campaign.status } }
      );
    }
  } catch (mongoErr) {
    console.warn('Mongoose direct job update error:', mongoErr);
  }

  await saveCampaignState(campaign);
  return job;
}

export async function clearActiveCampaign(): Promise<{
  deletedCampaigns: number;
  deletedJobs: number;
  cancelledSchedules: number;
  cancelledMessages: number;
}> {
  global.__jobApplierCampaign = null;
  global.__jobApplierLogs = [];

  let deletedCampaigns = 0;
  let deletedJobs = 0;

  // 1. Purge MongoDB
  try {
    const conn = await connectMongoose();
    if (conn) {
      const campRes = await Campaign.deleteMany({});
      const logRes = await EmailLog.deleteMany({});
      deletedCampaigns = campRes.deletedCount || 0;
      deletedJobs = logRes.deletedCount || 0;
    }
  } catch (e) {
    console.warn('Mongoose delete failed:', e);
  }

  // 2. Purge Redis
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(REDIS_CAMPAIGN_KEY);
      await redis.del(REDIS_LOGS_KEY);
    } catch (e) {
      console.warn('Redis delete failed:', e);
    }
  }

  // 3. Purge all Upstash QStash tasks, schedules, and messages
  let cancelledSchedules = 0;
  let cancelledMessages = 0;
  try {
    const { purgeAllQStashTasks } = await import('./upstash');
    const qRes = await purgeAllQStashTasks();
    cancelledSchedules = qRes.cancelledSchedules;
    cancelledMessages = qRes.cancelledMessages;
  } catch (qErr) {
    console.warn('QStash purge during clear error:', qErr);
  }

  return {
    deletedCampaigns,
    deletedJobs,
    cancelledSchedules,
    cancelledMessages,
  };
}
