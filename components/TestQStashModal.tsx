'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  Bot, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Shuffle
} from 'lucide-react';
import Link from 'next/link';

interface TestQStashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess?: () => void;
}

export default function TestQStashModal({
  isOpen,
  onClose,
  onScheduledSuccess,
}: TestQStashModalProps) {
  const [email, setEmail] = useState('vishalni2005@gmail.com');
  const [company, setCompany] = useState('Solobuild AI Innovations');
  const [role, setRole] = useState('Full-Stack Developer');
  const [delaySeconds, setDelaySeconds] = useState<number>(60);
  const [customInstructions, setCustomInstructions] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Scheduled job state
  const [scheduledJob, setScheduledJob] = useState<{
    success: boolean;
    messageId?: string;
    jobId?: string;
    scheduledFor?: string;
    delaySeconds?: number;
    targetEmail?: string;
    isSimulated?: boolean;
    message?: string;
    destinationUrl?: string;
  } | null>(null);

  // Countdown timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setIsFiring(true);
      const doneTimer = setTimeout(() => {
        setIsFiring(false);
        setIsCompleted(true);
        if (onScheduledSuccess) onScheduledSuccess();
      }, 3500);
      return () => clearTimeout(doneTimer);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, onScheduledSuccess]);

  if (!isOpen) return null;

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid recipient email.');
      return;
    }

    try {
      setIsScheduling(true);
      setScheduledJob(null);
      setCountdown(null);
      setIsFiring(false);
      setIsCompleted(false);

      const res = await fetch('/api/queue/schedule-test-1min', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          company,
          catName: role,
          delaySeconds,
          customInstructions,
        }),
      });

      const data = await res.json();
      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      setScheduledJob(data);
      setCountdown(data.delaySeconds || delaySeconds);

      if (onScheduledSuccess) {
        onScheduledSuccess();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to schedule QStash test');
    } finally {
      setIsScheduling(false);
    }
  };

  const copyMessageId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setScheduledJob(null);
    setCountdown(null);
    setIsFiring(false);
    setIsCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-600/30 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Upstash QStash 1-Min Test Scheduler
                </h3>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  60s Async
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Schedules a live background job in QStash for 1 minute from now
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-purple-500/20 flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">Model Rotation</span>
              <span className="text-slate-200 font-semibold truncate">Gemini 2.5 & 3.5 Pool</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-amber-500/20 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">QStash Queue Delay</span>
              <span className="text-amber-300 font-semibold">{delaySeconds}s (1 Minute)</span>
            </div>
          </div>
        </div>

        {/* Active Countdown / Scheduled Card */}
        {scheduledJob && (
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-indigo-950/40 border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>QStash Job Scheduled Successfully</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                {scheduledJob.isSimulated ? 'Simulated' : 'Upstash Cloud Queued'}
              </span>
            </div>

            {/* Countdown Display */}
            <div className="text-center py-2 space-y-2">
              {countdown !== null && countdown > 0 && (
                <div>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 text-3xl font-extrabold font-mono text-cyan-300 animate-pulse">
                    {countdown}s
                  </div>
                  <div className="text-xs font-semibold text-slate-300 mt-2">
                    ⏱️ QStash will fire webhook in <span className="text-cyan-400 font-bold">{countdown} seconds</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scheduled for: {new Date(scheduledJob.scheduledFor || '').toLocaleTimeString()}
                  </p>
                </div>
              )}

              {isFiring && (
                <div className="py-3 space-y-2 animate-bounce">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    <Zap className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="text-sm font-bold text-amber-300">
                    ⚡ QStash Firing Callback Webhook!
                  </div>
                  <p className="text-xs text-slate-300">
                    Generating dynamic email with Gemini AI rotation & sending with resume...
                  </p>
                </div>
              )}

              {isCompleted && (
                <div className="py-2 space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    ✅ 1-Minute QStash Test Completed!
                  </div>
                  <p className="text-xs text-slate-300">
                    Delivered to <strong className="text-white">{scheduledJob.targetEmail}</strong> with PDF attachment.
                  </p>
                </div>
              )}
            </div>

            {/* QStash Message ID Details */}
            {scheduledJob.messageId && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span>QStash Message ID:</span>
                  <button
                    type="button"
                    onClick={() => copyMessageId(scheduledJob.messageId || '')}
                    className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-cyan-300 text-[10px] truncate">
                  {scheduledJob.messageId}
                </div>
              </div>
            )}

            {/* Quick action buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Schedule Another Test
              </button>

              <Link
                href="/queue"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <span>View in Live Queue Logs</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* Schedule Form */}
        {!scheduledJob && (
          <form onSubmit={handleSchedule} className="space-y-4 text-xs">
            {/* Recipient Email */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Send Test Email To:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. vishalni2005@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none text-xs"
              />
            </div>

            {/* Company & Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Target Company:
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Candidate Role:
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none text-xs"
                />
              </div>
            </div>

            {/* Delay Interval Selection */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                QStash Delay Duration (Seconds):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { sec: 10, label: '10s (Fast)' },
                  { sec: 60, label: '60s (1 Min)' },
                  { sec: 120, label: '2 Min' },
                  { sec: 300, label: '5 Min' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setDelaySeconds(item.sec)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      delaySeconds === item.sec
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                QStash will hold the message in queue and trigger execution exactly at{' '}
                <strong className="text-slate-300">
                  {new Date(Date.now() + delaySeconds * 1000).toLocaleTimeString()}
                </strong>
                .
              </p>
            </div>

            {/* Notes / Instructions */}
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Custom Candidate Prompt (Optional):
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Highlight real-time WebSocket & Redis BullMQ project experience"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none text-xs"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isScheduling}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-cyan-500 hover:from-amber-400 hover:via-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-[1.02] disabled:opacity-50 transition-all"
              >
                {isScheduling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-200" />
                )}
                Schedule in Upstash for {delaySeconds}s (1 Min)
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
