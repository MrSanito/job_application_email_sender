import { NextRequest, NextResponse } from 'next/server';
import { updateJobResult } from '@/lib/campaign-store';
import { sendEmailAsync } from '@/lib/mailer';
import { generateOnTheSpotEmail } from '@/lib/ai-generator';
import { syncRollingQStashJobs } from '@/lib/rolling-scheduler';
import { Lead } from '@/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const payload = await req.json();
    const { jobId, lead, subject, bodyHtml, useAi = true, customPrompt, candidateProfile } = payload as {
      jobId: string;
      campaignId?: string;
      lead: Lead;
      subject?: string;
      bodyHtml?: string;
      useAi?: boolean;
      customPrompt?: string;
      candidateProfile?: {
        name?: string;
        role?: string;
        skills?: string;
        portfolioUrl?: string;
      };
    };

    if (!jobId || !lead || !lead.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid dispatch payload. Missing jobId or lead email.' },
        { status: 400 }
      );
    }

    // Update status to processing
    await updateJobResult(jobId, 'processing');

    let finalSubject = subject || '';
    let finalHtml = bodyHtml || '';
    let aiModelUsed = 'Template Engine';

    // DYNAMIC ON-THE-SPOT EMAIL GENERATION WITH LANGCHAIN & MISTRAL AI + TAVILY
    if (useAi || !bodyHtml) {
      try {
        const aiResult = await generateOnTheSpotEmail(lead, customPrompt, candidateProfile);
        finalSubject = aiResult.subject;
        finalHtml = aiResult.htmlBody;
        if (aiResult.isAiGenerated) {
          aiModelUsed = aiResult.modelUsed || 'Mistral AI (LangChain)';
        }
      } catch (aiErr) {
        console.warn('AI generation error in dispatch, continuing with template:', aiErr);
      }
    }

    // Send email asynchronously
    const sendResult = await sendEmailAsync({
      to: lead.email,
      subject: finalSubject || `Application for ${lead.catName || 'Engineering'} - Job Applicant`,
      html: finalHtml,
    });

    const durationMs = Date.now() - startTime;

    if (sendResult.success) {
      const finalStatus = sendResult.isSimulated ? 'simulated' : 'sent';
      await updateJobResult(jobId, finalStatus, {
        durationMs,
        messageId: sendResult.messageId,
        subject: finalSubject,
        htmlBody: finalHtml,
        modelUsed: aiModelUsed,
        isAiGenerated: aiModelUsed.toLowerCase().includes('mistral'),
      });

      // Asynchronously advance the rolling 7-day window for multi-week campaigns
      syncRollingQStashJobs().catch((e) => console.warn('Rolling sync on dispatch warning:', e));

      return NextResponse.json({
        success: true,
        jobId,
        status: finalStatus,
        messageId: sendResult.messageId,
        isSimulated: sendResult.isSimulated,
        generator: aiModelUsed,
        subject: finalSubject,
        htmlBody: finalHtml,
        durationMs,
      });
    } else {
      await updateJobResult(jobId, 'failed', {
        error: sendResult.error || 'Failed to send email',
        durationMs,
      });

      return NextResponse.json({
        success: false,
        jobId,
        status: 'failed',
        error: sendResult.error,
        durationMs,
      });
    }
  } catch (error: unknown) {
    console.error('Async dispatch webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal async dispatch error',
      },
      { status: 500 }
    );
  }
}
