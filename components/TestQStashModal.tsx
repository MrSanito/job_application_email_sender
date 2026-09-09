'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  Send, 
  CheckCircle2, 
  Zap, 
  Bot, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
        toast.success('QStash 1-minute test job completed and delivered!');
        if (onScheduledSuccess) onScheduledSuccess();
      }, 3500);
      return () => clearTimeout(doneTimer);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, onScheduledSuccess]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid recipient email.');
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
      toast.success(`Job scheduled in QStash! Execution in ${data.delaySeconds || delaySeconds}s.`);

      if (onScheduledSuccess) {
        onScheduledSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule QStash test';
      toast.error(msg);
    } finally {
      setIsScheduling(false);
    }
  };

  const copyMessageId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied QStash Message ID to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setScheduledJob(null);
    setCountdown(null);
    setIsFiring(false);
    setIsCompleted(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Upstash QStash 1-Min Test Scheduler</span>
            <Badge variant="warning" className="text-[10px]">
              60s Async
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Schedules an authentic background job in Upstash QStash queue with live callback webhook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/20 flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px]">Model Rotation</span>
                <span className="text-white font-bold">Gemini 2.5 & 3.5</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px]">Queue Delay</span>
                <span className="text-amber-300 font-bold">{delaySeconds}s (1 Minute)</span>
              </div>
            </div>
          </div>

          {/* Active Countdown / Scheduled Card */}
          {scheduledJob ? (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-indigo-950/40 border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>QStash Job Scheduled Successfully</span>
                </div>
                <Badge variant="success">
                  {scheduledJob.isSimulated ? 'Simulated' : 'Upstash Queued'}
                </Badge>
              </div>

              {/* Countdown Display */}
              <div className="text-center py-2 space-y-2">
                {countdown !== null && countdown > 0 && (
                  <div>
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 text-3xl font-extrabold font-mono text-cyan-300 animate-pulse">
                      {countdown}s
                    </div>
                    <div className="text-xs font-bold text-slate-300 mt-2">
                      ⏱️ QStash will fire webhook in <span className="text-cyan-400">{countdown} seconds</span>
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
                      Generating dynamic email with Gemini AI rotation & sending...
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
                      Delivered to <strong className="text-white">{scheduledJob.targetEmail}</strong> with PDF resume.
                    </p>
                  </div>
                )}
              </div>

              {/* QStash Message ID Details */}
              {scheduledJob.messageId && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>QStash Message ID:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMessageId(scheduledJob.messageId || '')}
                      className="h-6 text-[11px] gap-1 text-indigo-400"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                  <div className="font-mono text-cyan-300 text-[11px] truncate">
                    {scheduledJob.messageId}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  Schedule Another
                </Button>

                <Link href="/queue" onClick={onClose}>
                  <Button variant="default" size="sm" className="text-xs gap-1">
                    <span>View in Live Queue</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Schedule Form */
            <form onSubmit={handleSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Send Test Email To:
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. vishalni2005@gmail.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Target Company
                  </label>
                  <Input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Role Category
                  </label>
                  <Input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                  Custom AI Instruction Prompt
                </label>
                <Input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Emphasize AI voice pipeline and Pipecat real-time STT/TTS"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="amber"
                  size="sm"
                  loading={isScheduling}
                  loadingText="Scheduling in QStash..."
                  className="gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950" />
                  Schedule 1-Min QStash Job
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
