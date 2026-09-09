import { NextRequest, NextResponse } from 'next/server';
import { getActiveCampaign, updateJobResult } from '@/lib/campaign-store';
import { sendEmailAsync } from '@/lib/mailer';
import { generateOnTheSpotEmail } from '@/lib/ai-generator';

export async function POST(req: NextRequest) {
  try {
    const { count = 1, useAi = true } = (await req.json().catch(() => ({}))) as {
      count?: number;
      useAi?: boolean;
    };
    const campaign = await getActiveCampaign();

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'No active campaign found.' },
        { status: 404 }
      );
    }

    // Find next queued jobs
    const pendingJobs = campaign.jobs.filter((j) => j.status === 'queued').slice(0, count);

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending queued emails to process.',
        processedCount: 0,
      });
    }

    // Process asynchronously with LangChain on-the-spot generation
    const results = [];
    for (const job of pendingJobs) {
      await updateJobResult(job.id, 'processing');
      const sendStart = Date.now();

      let subjectToSend = job.subject;
      let htmlToSend = job.bodyHtml;
      let textToSend = '';
      let isAiGenerated = false;
      let modelUsed = 'Template Engine';

      // On-the-spot Dynamic Generation with Mistral AI & LangChain
      if (useAi) {
        try {
          const aiGen = await generateOnTheSpotEmail(
            job.lead,
            campaign.config.customInstructions,
            {
              name: campaign.config.candidateName,
              role: campaign.config.candidateRole,
              skills: campaign.config.candidateSkills,
              portfolioUrl: campaign.config.candidatePortfolio,
            }
          );
          if (aiGen.isAiGenerated) {
            subjectToSend = aiGen.subject;
            htmlToSend = aiGen.htmlBody;
            textToSend = aiGen.textBody;
            isAiGenerated = true;
            modelUsed = aiGen.modelUsed || 'Mistral AI (LangChain)';
            job.subject = aiGen.subject;
            job.bodyHtml = aiGen.htmlBody;
          }
        } catch (e) {
          console.warn('AI generation error for lead:', job.lead.email, e);
        }
      }

      const sendResult = await sendEmailAsync({
        to: job.lead.email,
        subject: subjectToSend,
        html: htmlToSend,
        text: textToSend,
      });

      const durationMs = Date.now() - sendStart;
      const finalStatus = sendResult.success
        ? sendResult.isSimulated
          ? 'simulated'
          : 'sent'
        : 'failed';

      await updateJobResult(job.id, finalStatus, {
        error: sendResult.error,
        durationMs,
        messageId: sendResult.messageId,
        subject: subjectToSend,
        htmlBody: htmlToSend,
        isAiGenerated,
        modelUsed,
      });

      results.push({
        jobId: job.id,
        leadEmail: job.lead.email,
        leadName: job.lead.name,
        leadCompany: job.lead.company,
        status: finalStatus,
        subject: subjectToSend,
        htmlBody: htmlToSend,
        textBody: textToSend,
        isAiGenerated,
        modelUsed,
        isSimulated: sendResult.isSimulated,
        messageId: sendResult.messageId,
        durationMs,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (error: unknown) {
    console.error('Trigger next error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger jobs',
      },
      { status: 500 }
    );
  }
}
