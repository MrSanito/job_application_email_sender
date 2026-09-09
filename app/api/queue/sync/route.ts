import { NextResponse } from 'next/server';
import { syncRollingQStashJobs } from '@/lib/rolling-scheduler';

export async function GET() {
  try {
    const result = await syncRollingQStashJobs();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Sync complete. Checked ${result.checked} queued jobs; newly registered ${result.newlyScheduled} jobs within the 7-day window.`,
    });
  } catch (err: unknown) {
    console.error('Rolling sync error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
