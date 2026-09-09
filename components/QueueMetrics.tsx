'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  RefreshCw, 
  Trash2, 
  Send, 
  Sparkles,
  Zap,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { CampaignState } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface QueueMetricsProps {
  campaign: CampaignState | null;
  onRefresh: () => void;
  onCampaignAction: (action: 'pause' | 'resume' | 'clear') => Promise<void>;
  onTriggerNext: (count: number) => Promise<void>;
  onOpenQStashTest?: () => void;
  isProcessingBatch: boolean;
}

export default function QueueMetrics({
  campaign,
  onRefresh,
  onCampaignAction,
  onTriggerNext,
  onOpenQStashTest,
  isProcessingBatch,
}: QueueMetricsProps) {
  const [triggerCount, setTriggerCount] = useState<number>(5);
  const [isActing, setIsActing] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  if (!campaign) {
    return (
      <Card glass className="p-10 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">No Active Campaign Queued</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
          Upload an Excel lead sheet and configure your schedule on the Leads & Planner page, or run a 1-minute instant test in Upstash QStash.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button variant="default" className="gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              Go to Leads & Campaign Planner
            </Button>
          </Link>

          {onOpenQStashTest && (
            <Button
              variant="amber"
              onClick={onOpenQStashTest}
              className="gap-2"
            >
              <Zap className="w-4 h-4 text-slate-950" />
              <span>⏱️ Schedule 1-Min QStash Test</span>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const { stats, calculation, status } = campaign;
  const progressPercent = stats.total > 0 
    ? Math.round(((stats.sent + stats.simulated) / stats.total) * 100) 
    : 0;

  const handleAction = async (action: 'pause' | 'resume' | 'clear') => {
    try {
      setIsActing(true);
      await onCampaignAction(action);
      if (action === 'pause') toast.warning('Campaign execution paused');
      if (action === 'resume') toast.success('Campaign execution resumed');
      if (action === 'clear') toast.info('Campaign cleared and reset');
    } catch {
      toast.error(`Failed to ${action} campaign`);
    } finally {
      setIsActing(false);
      setIsResetConfirmOpen(false);
    }
  };

  const handleTrigger = async () => {
    try {
      await onTriggerNext(triggerCount);
      toast.success(`Dispatched ${triggerCount} emails asynchronously!`);
    } catch {
      toast.error('Failed to dispatch batch');
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Title & Status Header */}
      <Card glass className="shadow-2xl overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-white tracking-tight">{campaign.name}</h2>
                {status === 'running' && (
                  <Badge variant="success" dot className="text-xs">
                    RUNNING
                  </Badge>
                )}
                {status === 'paused' && (
                  <Badge variant="warning" dot className="text-xs">
                    PAUSED
                  </Badge>
                )}
                {status === 'completed' && (
                  <Badge variant="default" dot className="text-xs">
                    COMPLETED
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Campaign ID: <span className="font-mono text-slate-300">{campaign.id}</span> • Created:{' '}
                {new Date(campaign.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Action Control Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                Refresh
              </Button>

              {status === 'running' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('pause')}
                  loading={isActing}
                  className="text-xs gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause Campaign
                </Button>
              ) : status === 'paused' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('resume')}
                  loading={isActing}
                  className="text-xs gap-1.5 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume Campaign
                </Button>
              ) : null}

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={isActing}
                className="text-xs gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Total Campaign Completion</span>
              <span className="font-mono text-cyan-400 font-bold">{progressPercent}% Dispatched</span>
            </div>
            <Progress value={progressPercent} />
          </div>
        </CardContent>
      </Card>

      {/* 5 Real-Time Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Queued */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>In Queue</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {stats.queued.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending dispatch</div>
        </div>

        {/* Sent & Simulated */}
        <div className="rounded-2xl bg-emerald-950/20 border border-emerald-800/40 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>Sent Successfully</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-300 tracking-tight">
            {(stats.sent + stats.simulated).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-1">
            {stats.simulated > 0 ? `(${stats.simulated} async simulated)` : 'Delivered'}
          </div>
        </div>

        {/* Processing */}
        <div className="rounded-2xl bg-cyan-950/20 border border-cyan-800/40 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span>In Flight</span>
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-300 tracking-tight">
            {stats.processing}
          </div>
          <div className="text-[11px] text-cyan-400/70 mt-1">Active worker</div>
        </div>

        {/* Failed */}
        <div className="rounded-2xl bg-rose-950/20 border border-rose-800/40 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span>Failed / Bounced</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-300 tracking-tight">
            {stats.failed}
          </div>
          <div className="text-[11px] text-rose-400/70 mt-1">Needs review</div>
        </div>

        {/* Campaign Duration */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Duration</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-300 tracking-tight">
            {calculation.totalDaysToRun} <span className="text-xs text-slate-400 font-normal">Days</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{calculation.emailsPerDay} mails/day</div>
        </div>

      </div>

      {/* Manual Async Batch Sender Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-cyan-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-300 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              Instant Async Dispatch Tester
            </div>
            <div className="text-[11px] text-slate-400">
              Immediately trigger and stream the next batch of queued jobs asynchronously to observe live delivery logs.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            {[1, 5, 10, 25].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTriggerCount(num)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
                  triggerCount === num
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <Button
            variant="glowing"
            size="sm"
            onClick={handleTrigger}
            loading={isProcessingBatch}
            loadingText="Triggering..."
            disabled={stats.queued === 0}
            className="text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Trigger Next {triggerCount} Now
          </Button>

          {onOpenQStashTest && (
            <Button
              variant="amber"
              size="sm"
              onClick={onOpenQStashTest}
              className="text-xs"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>⏱️ Test 1-Min</span>
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Reset & Clear Campaign?</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset this campaign? All pending email jobs, logs, and schedule state will be cleared.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleAction('clear')}
              loading={isActing}
              loadingText="Resetting..."
            >
              Yes, Reset Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
