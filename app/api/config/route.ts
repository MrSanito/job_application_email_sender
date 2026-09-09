import { NextResponse } from 'next/server';
import { getAppSettings, testQStashConnection } from '@/lib/upstash';
import { testSmtpConnection } from '@/lib/mailer';
import { testMistralConnection, getAllMistralApiKeys, getAllGeminiApiKeys, testGeminiConnection } from '@/lib/ai-generator';
import { testMongooseConnection } from '@/lib/mongodb';

export async function GET() {
  const settings = getAppSettings();
  const mistralKeys = getAllMistralApiKeys();
  const geminiKeys = getAllGeminiApiKeys();
  const hasTavily = Boolean(process.env.TAVILY_API_KEY);
  const hasMongo = Boolean(process.env.MONGODB_URI);

  return NextResponse.json({
    success: true,
    config: {
      hasMistral: mistralKeys.length > 0,
      mistralKeysCount: mistralKeys.length,
      hasTavily,
      hasGemini: mistralKeys.length > 0 || geminiKeys.length > 0,
      geminiKeysCount: mistralKeys.length || geminiKeys.length,
      hasMongo,
      hasQstash: Boolean(settings.qstashToken),
      hasRedis: Boolean(settings.upstashRedisUrl && settings.upstashRedisToken),
      hasSmtp: Boolean(settings.smtpUser && settings.smtpPass),
      isSimulationMode: settings.isSimulationMode,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUserMasked: settings.smtpUser ? settings.smtpUser.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '',
      webhookBaseUrl: settings.webhookBaseUrl,
      smtpFrom: settings.smtpFrom,
    },
  });
}

export async function POST(req: Request) {
  try {
    const { action } = (await req.json().catch(() => ({}))) as {
      action?: 'smtp' | 'gemini' | 'mistral' | 'ai' | 'mongo' | 'qstash';
    };

    if (action === 'mongo') {
      const mongoStatus = await testMongooseConnection();
      return NextResponse.json({ success: true, mongo: mongoStatus });
    }

    if (action === 'qstash') {
      const qstashStatus = await testQStashConnection();
      return NextResponse.json({ success: true, qstash: qstashStatus });
    }

    if (action === 'mistral' || action === 'ai' || action === 'gemini') {
      const mistralStatus = await testMistralConnection();
      return NextResponse.json({ success: true, mistral: mistralStatus, gemini: mistralStatus });
    }

    // Default test SMTP
    const smtpStatus = await testSmtpConnection();
    return NextResponse.json({
      success: true,
      smtp: smtpStatus,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Test failed' },
      { status: 500 }
    );
  }
}
