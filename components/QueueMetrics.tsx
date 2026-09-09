'use client';

import React, { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { CampaignState } from '@/types';

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

  if (!campaign) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">No Active Campaign Queued</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
          Upload an Excel lead sheet and configure your schedule on the Leads & Planner page, or run a 1-minute instant test in Upstash QStash.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Go to Leads & Campaign Planner
          </a>

          {onOpenQStashTest && (
            <button
              type="button"
              onClick={onOpenQStashTest}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all hover:scale-[1.02]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⏱️ Schedule 1-Min QStash Test</span>
            </button>
          )}
        </div>
      </div>
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
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Title & Status Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{campaign.name}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  status === 'running'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : status === 'paused'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                    : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                }`}
              >
                {status === 'running' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                {status === 'paused' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Campaign ID: <span className="font-mono text-slate-300">{campaign.id}</span> • Created:{' '}
              {new Date(campaign.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Action Control Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Manual Refresh */}
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>

            {/* Pause / Resume */}
            {status === 'running' ? (
              <button
                type="button"
                onClick={() => handleAction('pause')}
                disabled={isActing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            ) : status === 'paused' ? (
              <button
                type="button"
                onClick={() => handleAction('resume')}
                disabled={isActing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            ) : null}

            {/* Clear Campaign */}
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to clear and reset this campaign?')) {
                  handleAction('clear');
                }
              }}
              disabled={isActing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Campaign Dispatch Progress</span>
            <span className="font-mono text-cyan-400 font-bold">{progressPercent}% Completed</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5 Real-Time Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Queued */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>In Queue</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats.queued.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Pending dispatch</div>
        </div>

        {/* Sent & Simulated */}
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>Sent Successfully</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 tracking-tight">
            {(stats.sent + stats.simulated).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400/70 mt-1">
            {stats.simulated > 0 ? `(${stats.simulated} async simulated)` : 'Delivered'}
          </div>
        </div>

        {/* Processing */}
        <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span>In Flight</span>
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 tracking-tight">
            {stats.processing}
          </div>
          <div className="text-[10px] text-cyan-400/70 mt-1">Active worker</div>
        </div>

        {/* Failed */}
        <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span>Failed / Bounced</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 tracking-tight">
            {stats.failed}
          </div>
          <div className="text-[10px] text-rose-400/70 mt-1">Needs review</div>
        </div>

        {/* Campaign Duration */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Schedule Duration</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {calculation.totalDaysToRun} <span className="text-xs text-slate-400">Days</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{calculation.emailsPerDay} mails/day</div>
        </div>

      </div>

      {/* Manual Async Batch Sender Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-cyan-950/30 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-300">
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
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-colors ${
                  triggerCount === num
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onTriggerNext(triggerCount)}
            disabled={isProcessingBatch || stats.queued === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isProcessingBatch ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Trigger Next {triggerCount} Now
          </button>

          {onOpenQStashTest && (
            <button
              type="button"
              onClick={onOpenQStashTest}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all hover:scale-[1.02]"
              title="Schedule a 1-minute test job via Upstash QStash"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⏱️ Test 1-Min QStash</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
