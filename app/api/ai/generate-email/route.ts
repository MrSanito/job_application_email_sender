import { NextRequest, NextResponse } from 'next/server';
import { generateOnTheSpotEmail } from '@/lib/ai-generator';
import { Lead } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { lead, customPrompt, candidateProfile } = (await req.json()) as {
      lead: Lead;
      customPrompt?: string;
      candidateProfile?: {
        name?: string;
        role?: string;
        skills?: string;
        portfolioUrl?: string;
      };
    };

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead details are required for AI generation.' },
        { status: 400 }
      );
    }

    const result = await generateOnTheSpotEmail(lead, customPrompt, candidateProfile);

    return NextResponse.json({
      success: true,
      subject: result.subject,
      htmlBody: result.htmlBody,
      textBody: result.textBody,
      isAiGenerated: result.isAiGenerated,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (error: unknown) {
    console.error('AI Generation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate AI email',
      },
      { status: 500 }
    );
  }
}
