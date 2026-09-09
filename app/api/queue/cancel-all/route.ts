import { NextRequest, NextResponse } from 'next/server';
import { purgeAllQStashTasks, getRedisClient } from '@/lib/upstash';
import { connectMongoose } from '@/lib/mongodb';
import { Campaign } from '@/models/Campaign';
import { EmailLog } from '@/models/EmailLog';
import { REDIS_CAMPAIGN_KEY, clearActiveCampaign } from '@/lib/campaign-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'clear';

    if (mode === 'clear') {
      const clearRes = await clearActiveCampaign();
      return NextResponse.json({
        success: true,
        message: `All jobs cleared! (${clearRes.deletedJobs} database jobs deleted, ${clearRes.cancelledMessages} QStash tasks cancelled).`,
        details: clearRes,
      });
    }
    // 1. Cancel all QStash schedules and delayed messages
    const qstashResult = await purgeAllQStashTasks();

    // 2. Mark active jobs as cancelled in MongoDB
    let dbCancelledJobs = 0;
    try {
      const conn = await connectMongoose();
      if (conn) {
        const updateRes = await EmailLog.updateMany(
          { status: { $in: ['queued', 'processing'] } },
          { $set: { status: 'cancelled', error: 'Cancelled by user request' } }
        );
        dbCancelledJobs = updateRes.modifiedCount;

        await Campaign.updateMany(
          { status: { $in: ['running', 'paused'] } },
          { $set: { status: 'cancelled' } }
        );
      }
    } catch (dbErr) {
      console.warn('MongoDB cancel-all error:', dbErr);
    }

    // 3. Clear memory store
    if (global.__jobApplierCampaign) {
      global.__jobApplierCampaign.status = 'cancelled';
      if (global.__jobApplierCampaign.jobs) {
        global.__jobApplierCampaign.jobs.forEach((j) => {
          if (j.status === 'queued' || j.status === 'processing') {
            j.status = 'cancelled';
          }
        });
      }
    }

    // 4. Clear Upstash Redis active campaign key if present
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(REDIS_CAMPAIGN_KEY);
      } catch (rErr) {
        console.warn('Redis delete key error:', rErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `All scheduled tasks cancelled! (${dbCancelledJobs} database jobs marked cancelled, ${qstashResult.cancelledMessages} QStash messages purged).`,
      details: {
        dbCancelledJobs,
        qstashResult,
      },
    });
  } catch (error: unknown) {
    console.error('Cancel all error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel all tasks',
      },
      { status: 500 }
    );
  }
}
