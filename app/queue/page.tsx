'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import QueueMetrics from '@/components/QueueMetrics';
import DeliveryLogsTable from '@/components/DeliveryLogsTable';
import SettingsModal from '@/components/SettingsModal';
import TestQStashModal from '@/components/TestQStashModal';
import { CampaignState, QueueJob } from '@/types';
import { Activity, RefreshCw, AlertTriangle, Zap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);
  const [isCancellingAll, setIsCancellingAll] = useState(false);

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
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Campaign ${action} completed successfully`);
      } else {
        toast.error(data.error || `Failed to ${action} campaign`);
      }
      await fetchStatus();
    } catch (e) {
      console.error('Campaign action failed:', e);
      toast.error(`Error performing ${action} action`);
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

  // Clear all pending QStash tasks & database jobs
  const handleClearAll = async () => {
    try {
      setIsCancellingAll(true);
      const res = await fetch('/api/queue/cancel-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'clear' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'All jobs cleared successfully!');
      } else {
        toast.error(data.error || 'Failed to clear all jobs.');
      }
      await fetchStatus();
    } catch (e) {
      console.error('Clear all error:', e);
      toast.error('Error communicating with clear endpoint.');
    } finally {
      setIsCancellingAll(false);
      setIsCancelConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
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
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="text-xs px-3 py-1 gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Step 2: Upstash Queue Monitor & Async Stream</span>
              </Badge>
              <Badge variant="success" dot className="text-xs px-3 py-1">
                Live Auto Sync
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Queue & Delivery Stream Monitor
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="gap-1.5 text-xs shadow-rose-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Jobs</span>
            </Button>

            <Button
              variant="amber"
              size="sm"
              onClick={() => setIsQstashTestOpen(true)}
              className="gap-1.5 text-xs shadow-amber-500/10"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>⏱️ Test 1-Min QStash</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStatus();
                toast.info('Refreshed queue status');
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* 1. Queue Metrics & Controls */}
        <section>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            </div>
          ) : (
            <QueueMetrics
              campaign={campaign}
              onRefresh={fetchStatus}
              onCampaignAction={handleCampaignAction}
              onTriggerNext={handleTriggerNext}
              onOpenQStashTest={() => setIsQstashTestOpen(true)}
              isProcessingBatch={isProcessingBatch}
            />
          )}
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

      {/* Clear All Jobs Modal Confirmation */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Clear All Jobs & Reset Queue?</span>
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all email jobs from MongoDB Atlas, purge all pending messages and queues from Upstash QStash, and reset the active campaign. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              loading={isCancellingAll}
              loadingText="Clearing All..."
            >
              Yes, Clear All Jobs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
