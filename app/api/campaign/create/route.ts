import { NextRequest, NextResponse } from 'next/server';
import { initializeCampaign, saveCampaignState } from '@/lib/campaign-store';
import { calculateCampaignPlan } from '@/lib/scheduler-calc';
import { scheduleQStashJob, getAppSettings, MAX_QSTASH_DELAY_SECONDS } from '@/lib/upstash';
import { CampaignConfig, Lead } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, leads, config, customCalculation } = body as {
      name?: string;
      leads: Lead[];
      config: CampaignConfig;
      customCalculation?: ReturnType<typeof calculateCampaignPlan>;
    };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No leads provided for campaign.' },
        { status: 400 }
      );
    }

    const calculation = customCalculation || calculateCampaignPlan(leads, config);
    const campaign = await initializeCampaign(name || 'New Lead Campaign', leads, config, calculation);

    const settings = getAppSettings();
    const webhookUrl = `${settings.webhookBaseUrl}/api/queue/dispatch`;

    // If QStash is active, register campaign jobs within the 7-day window to QStash email_job_queue
    if (settings.qstashToken) {
      const now = Date.now();
      
      for (const job of campaign.jobs) {
        if (job.status !== 'queued') continue;
        const targetTimeMs = new Date(job.scheduledTime).getTime();
        // True delay: difference between current moment and scheduled calendar time
        const delaySeconds = Math.max(0, Math.round((targetTimeMs - now) / 1000));
        
        // Upstash QStash maxDelay quota is 7 days (604,800s).
        // Only publish jobs within the 7-day window to prevent HTTP 412 quota errors
        if (delaySeconds <= MAX_QSTASH_DELAY_SECONDS) {
          const qstashRes = await scheduleQStashJob(
            job,
            webhookUrl,
            delaySeconds,
            settings.qstashToken,
            'email_job_queue'
          );

          if (qstashRes.messageId) {
            job.qStashMessageId = qstashRes.messageId;
          }
        }
      }

      // Persist updated jobs with QStash message IDs to MongoDB / Redis
      await saveCampaignState(campaign);
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      campaign,
      message: `Campaign created successfully! ${campaign.jobs.length} emails queued across ${calculation.totalDaysToRun} days.`,
    });
  } catch (error: unknown) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign',
      },
      { status: 500 }
    );
  }
}
