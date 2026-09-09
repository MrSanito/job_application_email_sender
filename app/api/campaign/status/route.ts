import { NextRequest, NextResponse } from 'next/server';
import { getActiveCampaign, saveCampaignState, clearActiveCampaign } from '@/lib/campaign-store';

export async function GET(req: NextRequest) {
  try {
    const campaign = await getActiveCampaign();
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.toLowerCase();
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    if (!campaign) {
      return NextResponse.json({
        success: true,
        hasActiveCampaign: false,
        campaign: null,
      });
    }

    let filteredJobs = campaign.jobs;

    if (statusFilter && statusFilter !== 'all') {
      filteredJobs = filteredJobs.filter((j) => j.status === statusFilter);
    }

    if (search) {
      filteredJobs = filteredJobs.filter(
        (j) =>
          j.lead.name.toLowerCase().includes(search) ||
          j.lead.email.toLowerCase().includes(search) ||
          (j.lead.company && j.lead.company.toLowerCase().includes(search)) ||
          (j.lead.catName && j.lead.catName.toLowerCase().includes(search)) ||
          j.subject.toLowerCase().includes(search)
      );
    }

    const totalJobs = filteredJobs.length;
    const startIndex = (page - 1) * limit;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      hasActiveCampaign: true,
      campaign: {
        ...campaign,
        jobs: paginatedJobs,
      },
      pagination: {
        total: totalJobs,
        page,
        limit,
        totalPages: Math.ceil(totalJobs / limit),
      },
      stats: campaign.stats,
    });
  } catch (error: unknown) {
    console.error('Error fetching campaign status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = (await req.json()) as { action: 'pause' | 'resume' | 'clear' };
    const campaign = await getActiveCampaign();

    if (action === 'clear') {
      const result = await clearActiveCampaign();
      return NextResponse.json({
        success: true,
        message: `All jobs cleared! (${result.deletedJobs} jobs deleted, ${result.cancelledMessages} QStash tasks purged).`,
        details: result,
      });
    }

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'No active campaign found.' }, { status: 404 });
    }

    if (action === 'pause') {
      campaign.status = 'paused';
      await saveCampaignState(campaign);
      return NextResponse.json({ success: true, message: 'Campaign paused.', campaign });
    }

    if (action === 'resume') {
      campaign.status = 'running';
      await saveCampaignState(campaign);
      return NextResponse.json({ success: true, message: 'Campaign resumed.', campaign });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
