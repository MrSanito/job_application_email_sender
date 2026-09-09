'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import QueueMetrics from '@/components/QueueMetrics';
import DeliveryLogsTable from '@/components/DeliveryLogsTable';
import SettingsModal from '@/components/SettingsModal';
import TestQStashModal from '@/components/TestQStashModal';
import { CampaignState, QueueJob } from '@/types';
import { Activity, RefreshCw } from 'lucide-react';

export default function QueuePage() {
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isQstashTestOpen, setIsQstashTestOpen] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  // Fetch campaign status and jobs
  const fetchStatus = useCallback(async () => {
    try {
      const url = new URL('/api/campaign/status', window.location.origin);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (search) url.searchParams.set('search', search);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(limit));

      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.success && data.hasActiveCampaign) {
        setCampaign(data.campaign);
        setJobs(data.campaign.jobs || []);
        setTotalCount(data.pagination?.total || 0);
      } else {
        setCampaign(null);
        setJobs([]);
        setTotalCount(0);
      }
    } catch (e) {
      console.warn('Fetch queue status failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchStatus();

    fetch('/api/config')
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setIsSimulated(d.config.isSimulationMode);
      })
      .catch(() => {});
  }, [fetchStatus]);

  // Campaign lifecycle handler (pause, resume, clear)
  const handleCampaignAction = async (action: 'pause' | 'resume' | 'clear') => {
    try {
      const res = await fetch('/api/campaign/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await res.json();
      await fetchStatus();
    } catch (e) {
      console.error('Campaign action failed:', e);
    }
  };

  // Trigger next batch asynchronously
  const handleTriggerNext = async (count: number) => {
    try {
      setIsProcessingBatch(true);
      const res = await fetch('/api/queue/trigger-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      await res.json();
      await fetchStatus();
    } catch (e) {
      console.error('Trigger next failed:', e);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Cancel all pending QStash tasks & database jobs
  const [isCancellingAll, setIsCancellingAll] = useState(false);
  const handleCancelAll = async () => {
    if (!confirm('Are you sure you want to cancel ALL pending QStash scheduled tasks and database jobs?')) {
      return;
    }
    try {
      setIsCancellingAll(true);
      const res = await fetch('/api/queue/cancel-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'All scheduled tasks cancelled successfully!');
      } else {
        alert(data.error || 'Failed to cancel all tasks.');
      }
      await fetchStatus();
    } catch (e) {
      console.error('Cancel all error:', e);
      alert('Error communicating with cancellation endpoint.');
    } finally {
      setIsCancellingAll(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQStashTest={() => setIsQstashTestOpen(true)}
        hasActiveCampaign={Boolean(campaign)}
        isSimulated={isSimulated}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step 2: Upstash Queue Monitor & Async Execution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Queue & Delivery Stream Monitor
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCancelAll}
              disabled={isCancellingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <span>{isCancellingAll ? 'Cancelling...' : '🛑 Cancel All Tasks'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQstashTestOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>⏱️ Test 1-Min QStash</span>
            </button>

            <button
              type="button"
              onClick={() => fetchStatus()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Refresh Status
            </button>
          </div>
        </div>

        {/* 1. Queue Metrics & Controls */}
        <section>
          <QueueMetrics
            campaign={campaign}
            onRefresh={fetchStatus}
            onCampaignAction={handleCampaignAction}
            onTriggerNext={handleTriggerNext}
            onOpenQStashTest={() => setIsQstashTestOpen(true)}
            isProcessingBatch={isProcessingBatch}
          />
        </section>

        {/* 2. Logs Table */}
        {campaign && (
          <section>
            <DeliveryLogsTable
              jobs={jobs}
              totalCount={totalCount}
              page={page}
              limit={limit}
              onPageChange={setPage}
              search={search}
              onSearchChange={(q) => {
                setSearch(q);
                setPage(1);
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={(st) => {
                setStatusFilter(st);
                setPage(1);
              }}
            />
          </section>
        )}

      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 1-Min Upstash QStash Test Modal */}
      <TestQStashModal
        isOpen={isQstashTestOpen}
        onClose={() => setIsQstashTestOpen(false)}
        onScheduledSuccess={fetchStatus}
      />
    </div>
  );
}
