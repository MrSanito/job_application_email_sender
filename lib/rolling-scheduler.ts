import { getActiveCampaign, saveCampaignState } from './campaign-store';
import { getAppSettings, scheduleQStashJob, MAX_QSTASH_DELAY_SECONDS } from './upstash';
import { connectMongoose } from './mongodb';
import { EmailLog } from '@/models/EmailLog';

let isSyncInProgress = false;

/**
 * Rolling 7-Day Queue Synchronizer:
 * Scans active campaign jobs stored in MongoDB / Redis.
 * Any job currently scheduled within the 7-day window (<= 604,800s)
 * that does not yet have an active QStash message ID will automatically be published to QStash.
 */
export async function syncRollingQStashJobs(): Promise<{
  checked: number;
  newlyScheduled: number;
}> {
  if (isSyncInProgress) {
    console.log('Rolling sync already in progress, skipping duplicate call.');
    return { checked: 0, newlyScheduled: 0 };
  }

  const settings = getAppSettings();
  if (!settings.qstashToken) {
    return { checked: 0, newlyScheduled: 0 };
  }

  isSyncInProgress = true;

  try {
    const campaign = await getActiveCampaign();
    if (!campaign || campaign.status !== 'running') {
      return { checked: 0, newlyScheduled: 0 };
    }

    const now = Date.now();
    const webhookUrl = `${settings.webhookBaseUrl}/api/queue/dispatch`;
    let newlyScheduled = 0;
    let checked = 0;

    for (const job of campaign.jobs) {
      if (job.status !== 'queued') continue;
      checked++;

      const hasActiveMessageId =
        job.qStashMessageId &&
        !job.qStashMessageId.startsWith('future-scheduled-') &&
        !job.qStashMessageId.startsWith('sim-');

      if (hasActiveMessageId) continue;

      const targetTimeMs = new Date(job.scheduledTime).getTime();
      const delaySeconds = Math.max(0, Math.round((targetTimeMs - now) / 1000));

      // If it has now entered the rolling 7-day window, publish to QStash
      if (delaySeconds <= MAX_QSTASH_DELAY_SECONDS) {
        const qstashRes = await scheduleQStashJob(
          job,
          webhookUrl,
          delaySeconds,
          settings.qstashToken,
          'email_job_queue'
        );

        if (qstashRes.messageId && !qstashRes.isSimulated) {
          job.qStashMessageId = qstashRes.messageId;
          newlyScheduled++;

          // Immediately stamp the ID in MongoDB to prevent any other concurrent process from scheduling it
          try {
            await connectMongoose();
            await EmailLog.updateOne(
              { id: job.id },
              { $set: { qStashMessageId: qstashRes.messageId } }
            );
          } catch (dbErr) {
            console.warn(`Could not stamp qStashMessageId for job ${job.id}:`, dbErr);
          }
        }
      }
    }

    if (newlyScheduled > 0) {
      await saveCampaignState(campaign);
    }

    return { checked, newlyScheduled };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Register a recurring background QStash Cron (every 6 hours)
 * to automatically wake up and sync the rolling 7-day queue for multi-week campaigns.
 */
export async function registerSyncCronSchedule(): Promise<{ success: boolean; scheduleId?: string }> {
  const settings = getAppSettings();
  const qstash = (await import('./upstash')).getQStashClient(settings.qstashToken);
  if (!qstash) return { success: false };

  try {
    const existing = await qstash.schedules.list();
    const alreadyExists = existing.some(
      (s) => s.destination?.includes('/api/queue/sync') || s.cron === '0 */6 * * *'
    );
    if (alreadyExists) {
      return { success: true, scheduleId: existing[0].scheduleId };
    }

    const isLocalhost = settings.webhookBaseUrl.includes('localhost') || settings.webhookBaseUrl.includes('127.0.0.1');
    const destination = isLocalhost ? 'https://httpbin.org/post' : `${settings.webhookBaseUrl}/api/queue/sync`;
    const res = await qstash.schedules.create({
      destination,
      cron: '0 */6 * * *', // Run every 6 hours
    });
    return { success: true, scheduleId: res.scheduleId };
  } catch (e) {
    console.warn('QStash cron sync schedule registration note:', e);
    return { success: false };
  }
}


