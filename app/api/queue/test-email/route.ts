import { NextRequest, NextResponse } from 'next/server';
import { sendEmailAsync } from '@/lib/mailer';
import { generateOnTheSpotEmail } from '@/lib/ai-generator';
import { renderTemplate } from '@/lib/template-engine';

export async function POST(req: NextRequest) {
  try {
    const { to, subjectTemplate, bodyTemplate, testData, useAi = true, customPrompt } = await req.json();

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid recipient email required for test.' },
        { status: 400 }
      );
    }

    const dummyLead = {
      id: 'test-lead-1',
      name: testData?.name || 'Jane Doe',
      email: to,
      catName: testData?.catName || 'Senior Full Stack Engineer',
      company: testData?.company || 'Acme Tech Innovations',
      address: testData?.address || 'San Francisco, CA',
      status: 'valid' as const,
    };

    let finalSubject = '';
    let finalHtml = '';
    let isAi = false;

    if (useAi) {
      const aiRes = await generateOnTheSpotEmail(dummyLead, customPrompt);
      finalSubject = `[TEST] ${aiRes.subject}`;
      finalHtml = aiRes.htmlBody;
      isAi = aiRes.isAiGenerated;
    } else {
      const renderedSubject = renderTemplate(
        subjectTemplate || 'Application for {{catName}} - Candidate',
        dummyLead
      );
      const renderedBody = renderTemplate(
        bodyTemplate || 'Hi {{name}}, I am excited to apply to {{company}}...',
        dummyLead
      );
      finalSubject = `[TEST] ${renderedSubject}`;
      finalHtml = renderedBody.replace(/\n/g, '<br/>');
    }

    const result = await sendEmailAsync({
      to,
      subject: finalSubject,
      html: finalHtml,
    });

    return NextResponse.json({
      success: result.success,
      isSimulated: result.isSimulated,
      isAiGenerated: isAi,
      messageId: result.messageId,
      error: result.error,
      latencyMs: result.latencyMs,
      renderedSubject: finalSubject,
      renderedBody: finalHtml,
    });
  } catch (error: unknown) {
    console.error('Test email error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}
