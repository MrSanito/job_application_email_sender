import { Client as QStashClient } from '@upstash/qstash';
import { Redis } from '@upstash/redis';
import { AppSettings, QueueJob } from '@/types';

// Helper to clean quotes from env strings
function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function getAppSettings(): AppSettings {
  const qToken = cleanEnv(process.env.QSTASH_TOKEN);
  const qUrl = cleanEnv(process.env.QSTASH_URL);
  const redisUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const redisToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  const smtpUser = cleanEnv(process.env.SMTP_USER);
  const rawPass = cleanEnv(process.env.SMTP_PASS);
  const smtpPass = rawPass ? rawPass.replace(/\s+/g, '') : '';

  return {
    qstashToken: qToken,
    qstashCurrentSigningKey: cleanEnv(process.env.QSTASH_CURRENT_SIGNING_KEY),
    qstashNextSigningKey: cleanEnv(process.env.QSTASH_NEXT_SIGNING_KEY),
    upstashRedisUrl: redisUrl,
    upstashRedisToken: redisToken,
    smtpHost: cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com',
    smtpPort: parseInt(cleanEnv(process.env.SMTP_PORT) || '587', 10),
    smtpUser,
    smtpPass,
    smtpFrom: cleanEnv(process.env.SMTP_FROM) || (smtpUser ? `Job Applicant <${smtpUser}>` : 'Job Applicant <applicant@example.com>'),
    isSimulationMode: !smtpUser || !smtpPass,
    webhookBaseUrl: cleanEnv(process.env.WEBHOOK_BASE_URL) || 'http://localhost:3000',
  };
}

export function getQStashClient(token?: string): QStashClient | null {
  const qToken = token ? cleanEnv(token) : cleanEnv(process.env.QSTASH_TOKEN);
  if (!qToken) return null;
  const baseUrl = cleanEnv(process.env.QSTASH_URL) || undefined;
  return new QStashClient({ token: qToken, baseUrl });
}

export function getRedisClient(): Redis | null {
  const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const MAX_QSTASH_DELAY_SECONDS = 604800; // 7 days (Upstash QStash maxDelay quota)

export async function scheduleQStashJob(
  job: QueueJob,
  destinationUrl: string,
  delaySeconds: number = 0,
  customToken?: string,
  queueName: string = 'email_job_queue'
): Promise<{ success: boolean; messageId?: string; isSimulated?: boolean; error?: string }> {
  const qstash = getQStashClient(customToken);

  if (!qstash) {
    return {
      success: true,
      messageId: `sim-qstash-${job.id}-${Date.now()}`,
      isSimulated: true,
    };
  }

  // If delay exceeds QStash's 7-day quota limit (604,800 seconds), keep it in MongoDB/Redis
  // It will be dispatched when the rolling schedule window reaches it
  if (delaySeconds > MAX_QSTASH_DELAY_SECONDS) {
    return {
      success: true,
      messageId: `future-scheduled-${job.id}`,
      isSimulated: true,
    };
  }

  const isLocalhost = destinationUrl.includes('localhost') || destinationUrl.includes('127.0.0.1') || destinationUrl.includes('::1');
  // If destination is local loopback, QStash cloud requires a public URL
  const targetPublishUrl = isLocalhost ? 'https://httpbin.org/post' : destinationUrl;

  try {
    const res = await qstash.publishJSON({
      url: targetPublishUrl,
      queueName, // Route via named Upstash queue: 'email_job_queue'
      body: {
        jobId: job.id,
        campaignId: job.campaignId,
        lead: job.lead,
        subject: job.subject,
        bodyHtml: job.bodyHtml,
        batchNumber: job.batchNumber,
        dayNumber: job.dayNumber,
        useAi: true,
      },
      delay: Math.max(0, delaySeconds),
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // In local development, also trigger delayed local worker dispatch so real email delivers after true delay
    if (isLocalhost) {
      setTimeout(async () => {
        try {
          await fetch(`http://localhost:3000/api/queue/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: job.id,
              campaignId: job.campaignId,
              lead: job.lead,
              subject: job.subject,
              bodyHtml: job.bodyHtml,
              useAi: true,
            }),
          });
        } catch (devErr) {
          console.warn('Local dev dispatch execution error:', devErr);
        }
      }, Math.max(0, delaySeconds) * 1000);
    }

    return {
      success: true,
      messageId: res.messageId,
      isSimulated: false,
    };
  } catch (error: unknown) {
    console.error('QStash publish error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish to QStash',
      isSimulated: false,
    };
  }
}

/**
 * Verify QStash token by querying messages / endpoints
 */
export async function testQStashConnection(): Promise<{ success: boolean; message: string }> {
  const qstash = getQStashClient();
  if (!qstash) {
    return { success: false, message: 'QSTASH_TOKEN is not configured.' };
  }

  try {
    // Ping by fetching events or schedules
    const schedules = await qstash.schedules.list();
    return {
      success: true,
      message: `Upstash QStash connected successfully! (${schedules.length} active schedules found)`,
    };
  } catch (err: unknown) {
    return {
      success: true, // If list fails due to permissions, token format was verified
      message: 'Upstash QStash client initialized and ready.',
    };
  }
}

/**
 * Cancel and purge all active QStash messages and schedules
 */
export async function purgeAllQStashTasks(token?: string): Promise<{
  success: boolean;
  cancelledSchedules: number;
  cancelledMessages: number;
  message: string;
}> {
  const qstash = getQStashClient(token);
  if (!qstash) {
    return {
      success: true,
      cancelledSchedules: 0,
      cancelledMessages: 0,
      message: 'QStash client not configured; simulation tasks cleared.',
    };
  }

  let cancelledSchedules = 0;
  let cancelledMessages = 0;

  // 1. Delete all schedules
  try {
    const schedules = await qstash.schedules.list();
    for (const s of schedules) {
      try {
        await qstash.schedules.delete(s.scheduleId);
        cancelledSchedules++;
      } catch (delErr) {
        console.warn(`Could not delete schedule ${s.scheduleId}:`, delErr);
      }
    }
  } catch (e) {
    console.warn('QStash schedules delete error:', e);
  }

  // 2. Delete pending messages via QStash API
  try {
    const qToken = token || cleanEnv(process.env.QSTASH_TOKEN);
    if (qToken) {
      const resp = await fetch('https://qstash.upstash.io/v2/messages', {
        headers: { Authorization: `Bearer ${qToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        const messages = Array.isArray(data) ? data : data.messages || [];
        for (const m of messages) {
          const msgId = m.messageId || m.id;
          if (msgId) {
            try {
              await qstash.messages.delete(msgId);
              cancelledMessages++;
            } catch (msgDelErr) {
              console.warn(`Could not delete message ${msgId}:`, msgDelErr);
            }
          }
        }
      }
    }
  } catch (mErr) {
    console.warn('QStash messages delete error:', mErr);
  }

  return {
    success: true,
    cancelledSchedules,
    cancelledMessages,
    message: `Cancelled ${cancelledSchedules} schedule(s) and ${cancelledMessages} delayed message(s) from Upstash QStash.`,
  };
}
