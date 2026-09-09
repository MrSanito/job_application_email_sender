import { NextRequest, NextResponse } from 'next/server';
import { scheduleQStashJob, getAppSettings } from '@/lib/upstash';
import { getActiveCampaign, saveCampaignState } from '@/lib/campaign-store';
import { QueueJob, Lead, CampaignState, CampaignConfig, CampaignCalculation } from '@/types';
import { getRandomRenderedSubject } from '@/lib/template-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      to = 'vishalni2005@gmail.com',
      name = 'Engineering Hiring Team',
      company = 'Solobuild AI Innovations',
      catName = 'Full-Stack Developer',
      website = 'https://zynito.in',
      address = 'San Francisco, CA',
      delaySeconds = 60,
      customInstructions,
    } = body as {
      to?: string;
      name?: string;
      company?: string;
      catName?: string;
      website?: string;
      address?: string;
      delaySeconds?: number;
      customInstructions?: string;
    };

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email is required.' },
        { status: 400 }
      );
    }

    const appSettings = getAppSettings();
    const destinationUrl = `${appSettings.webhookBaseUrl || 'http://localhost:3000'}/api/queue/dispatch`;

    const delaySec = Math.max(0, parseInt(String(delaySeconds), 10) || 60);
    const now = Date.now();
    const scheduledTime = new Date(now + delaySec * 1000).toISOString();
    const jobId = `test-1min-${Date.now()}`;
    const leadId = `lead-${Date.now()}`;

    const testLead: Lead = {
      id: leadId,
      name: name.trim(),
      company: company.trim(),
      email: to.trim(),
      catName: catName.trim(),
      website: website.trim(),
      address: address.trim(),
      status: 'valid',
    };

    const testJob: QueueJob = {
      id: jobId,
      campaignId: 'qstash-1min-test-campaign',
      leadId,
      lead: testLead,
      dayNumber: 1,
      batchNumber: 1,
      scheduledTime,
      status: 'queued',
      subject: getRandomRenderedSubject(testLead),
      bodyHtml: `Hi ${name.trim()},\n\nI am reaching out regarding full-stack engineering opportunities at ${company.trim()}. My GitHub portfolio is https://github.com/MrSanito\n\nBest regards,\nVishal`,
    };

    // Ensure job is tracked in store / MongoDB
    const activeCampaign = await getActiveCampaign();
    if (activeCampaign) {
      // Append job to existing campaign so it shows in Queue & Live Logs table
      activeCampaign.jobs.unshift(testJob);
      activeCampaign.stats.total += 1;
      activeCampaign.stats.queued += 1;
      await saveCampaignState(activeCampaign);
    } else {
      const config: CampaignConfig = {
        campaignName: 'Upstash QStash 1-Min Live Verification Test',
        senderName: 'Vishal Nishad',
        senderEmail: appSettings.smtpUser || 'applicant@zynito.in',
        subjectTemplate: `Application for {{catName}} - Vishal Nishad`,
        bodyTemplate: `Hi {{name}},\n\nI am reaching out regarding full-stack engineering opportunities at {{company}}. My portfolio is https://zynito.in\n\nBest regards,\nVishal Nishad`,
        emailsPerDay: 50,
        intervalSeconds: 60,
        intervalJitterSeconds: 5,
        batchesPerDay: 1,
        batchTimings: [{ batchNumber: 1, startTime: '09:00', endTime: '18:00' }],
        workDaysOnly: false,
        customInstructions: customInstructions || 'Genuine interest in joining their engineering team.',
        candidateName: 'Vishal Nishad',
        candidateRole: 'Full-Stack Developer',
        candidatePortfolio: 'https://zynito.in',
      };

      const calculation: CampaignCalculation = {
        totalLeads: 1,
        validLeads: 1,
        invalidLeads: 0,
        emailsPerDay: 1,
        emailsPerBatch: 1,
        totalBatches: 1,
        totalDaysToRun: 1,
        workDaysCount: 1,
        estimatedEndDate: scheduledTime,
        dailyActiveSendingMinutes: 1,
        averageIntervalSeconds: delaySec,
        deliverabilityScore: 'Optimal',
        deliverabilityAdvice: 'Single 1-minute test dispatch',
        schedulePreview: [],
      };

      const testCampaign: CampaignState = {
        id: 'qstash-1min-test-campaign',
        name: 'Upstash QStash 1-Min Live Verification Test',
        createdAt: new Date().toISOString(),
        status: 'running',
        config,
        leads: [testLead],
        calculation,
        stats: {
          total: 1,
          queued: 1,
          processing: 0,
          sent: 0,
          simulated: 0,
          failed: 0,
        },
        jobs: [testJob],
      };
      await saveCampaignState(testCampaign);
    }

    // Publish to Upstash QStash
    const qstashResult = await scheduleQStashJob(testJob, destinationUrl, delaySec);

    return NextResponse.json({
      success: qstashResult.success,
      messageId: qstashResult.messageId,
      jobId,
      scheduledFor: scheduledTime,
      delaySeconds: delaySec,
      targetEmail: to.trim(),
      company: company.trim(),
      destinationUrl,
      isSimulated: qstashResult.isSimulated,
      error: qstashResult.error,
      message: qstashResult.isSimulated
        ? `Async test job simulated for execution at ${new Date(scheduledTime).toLocaleTimeString()} (${delaySec}s delay).`
        : `Published to Upstash QStash! Message ID: ${qstashResult.messageId}. Scheduled execution at ${new Date(scheduledTime).toLocaleTimeString()} (${delaySec}s delay).`,
    });
  } catch (err: unknown) {
    console.error('Schedule 1-min test error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to schedule 1-min test in QStash',
      },
      { status: 500 }
    );
  }
}
