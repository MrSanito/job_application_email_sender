import { NextRequest, NextResponse } from 'next/server';
import { initializeCampaign } from '@/lib/campaign-store';
import { calculateCampaignPlan } from '@/lib/scheduler-calc';
import { scheduleQStashJob, getAppSettings } from '@/lib/upstash';
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

    // If QStash is active, register the first batch of jobs to QStash
    if (settings.qstashToken) {
      // Schedule the first batch jobs
      const firstBatchJobs = campaign.jobs.slice(0, calculation.emailsPerBatch);
      
      for (let i = 0; i < firstBatchJobs.length; i++) {
        const job = firstBatchJobs[i];
        const delaySeconds = i * (config.intervalSeconds || 60);
        await scheduleQStashJob(job, webhookUrl, delaySeconds, settings.qstashToken);
      }
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
