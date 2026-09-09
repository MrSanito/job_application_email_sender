'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { 
  Calculator, 
  Calendar, 
  Clock, 
  Layers, 
  ShieldCheck, 
  ShieldAlert, 
  Rocket, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { CampaignCalculation, CampaignConfig, Lead } from '@/types';
import { calculateCampaignPlan } from '@/lib/scheduler-calc';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CampaignSchedulerProps {
  leads: Lead[];
  subjectTemplate: string;
  bodyTemplate: string;
}

export default function CampaignScheduler({
  leads,
  subjectTemplate,
  bodyTemplate,
}: CampaignSchedulerProps) {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState('Full-Stack Developer Outreach');
  const [emailsPerDay, setEmailsPerDay] = useState<number>(50);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60);
  const [intervalJitterSeconds, setIntervalJitterSeconds] = useState<number>(10);
  const [batchesPerDay, setBatchesPerDay] = useState<number>(2);
  const [workDaysOnly, setWorkDaysOnly] = useState<boolean>(true);
  const [showFullTimeline, setShowFullTimeline] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [launchStep, setLaunchStep] = useState<number>(1);

  // Helper date/time getters
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNowTimeStr = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [startTime, setStartTime] = useState<string>('09:00');

  const setStartPreset = (preset: 'now' | 'tomorrow' | 'monday') => {
    const d = new Date();
    if (preset === 'now') {
      setStartDate(getTodayStr());
      setStartTime(getNowTimeStr());
      toast.info('Start time set to: Immediate');
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
      setStartTime('09:00');
      toast.info('Start time set to: Tomorrow 9:00 AM');
    } else if (preset === 'monday') {
      const dayOfWeek = d.getDay();
      const daysUntilNextMonday = ((1 + 7 - dayOfWeek) % 7) || 7;
      d.setDate(d.getDate() + daysUntilNextMonday);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
      setStartTime('09:00');
      toast.info('Start time set to: Next Monday 9:00 AM');
    }
  };

  // Dynamic batch timings
  const [batchTimings, setBatchTimings] = useState([
    { batchNumber: 1, startTime: '09:00', endTime: '12:00' },
    { batchNumber: 2, startTime: '14:00', endTime: '17:00' },
    { batchNumber: 3, startTime: '18:00', endTime: '20:00' },
    { batchNumber: 4, startTime: '21:00', endTime: '23:00' },
  ]);

  const activeTimings = useMemo(() => {
    return batchTimings.slice(0, batchesPerDay);
  }, [batchTimings, batchesPerDay]);

  const updateTiming = (index: number, field: 'startTime' | 'endTime', val: string) => {
    const updated = [...batchTimings];
    updated[index] = { ...updated[index], [field]: val };
    setBatchTimings(updated);
  };

  const campaignConfig: CampaignConfig = useMemo(() => {
    return {
      campaignName,
      senderName: 'Vishal Nishad',
      senderEmail: 'vishalni2005@gmail.com',
      candidateName: 'Vishal Nishad',
      candidateRole: 'Full-Stack Developer (MERN + Gen AI)',
      candidatePortfolio: 'https://github.com/MrSanito',
      candidateSkills: 'Next.js, React, Node.js, TypeScript, AI Voice systems (Pipecat), STT/TTS, BullMQ, Redis, MongoDB',
      subjectTemplate,
      bodyTemplate,
      emailsPerDay,
      intervalSeconds,
      intervalJitterSeconds,
      batchesPerDay,
      batchTimings: activeTimings,
      workDaysOnly,
      startDate,
      startTime,
    };
  }, [
    campaignName,
    subjectTemplate,
    bodyTemplate,
    emailsPerDay,
    intervalSeconds,
    intervalJitterSeconds,
    batchesPerDay,
    activeTimings,
    workDaysOnly,
    startDate,
    startTime,
  ]);

  const calculation: CampaignCalculation = useMemo(() => {
    return calculateCampaignPlan(leads, campaignConfig);
  }, [leads, campaignConfig]);

  // Launch Campaign with animated multi-step progress modal
  const handleLaunchCampaign = async () => {
    if (calculation.validLeads === 0) {
      toast.error('Please upload leads with valid email addresses before launching.');
      return;
    }

    try {
      setIsLaunching(true);
      setLaunchStep(1);

      // Step 1: Simulation delay for visual smoothness
      await new Promise((r) => setTimeout(r, 400));
      setLaunchStep(2);

      const res = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          leads,
          config: campaignConfig,
          customCalculation: calculation,
        }),
      });

      setLaunchStep(3);

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      setLaunchStep(4);
      toast.success(`Campaign launched! ${calculation.validLeads} emails scheduled.`);

      // Confetti celebration
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        setIsLaunching(false);
        router.push('/queue');
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to launch campaign';
      toast.error(msg);
      setIsLaunching(false);
    }
  };

  return (
    <>
      <Card glass className="shadow-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>
              <Calculator className="w-5 h-5 text-indigo-400" />
              <span>Smart Campaign Scheduler & Calculator</span>
            </CardTitle>
            <CardDescription>
              Configure daily sending quotas, humanized jitter, batch intervals, and project full timeline.
            </CardDescription>
          </div>

          <div className="w-full sm:w-72">
            <Input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign Name"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Start Date & Time */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Start Schedule
                </label>
                <Badge variant="success" className="text-[10px]">
                  {startDate} @ {startTime}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    min={getTodayStr()}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs font-mono px-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Time</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-8 text-xs font-mono px-2"
                  />
                </div>
              </div>

              {/* Quick Start Presets */}
              <div className="flex items-center gap-1 pt-1 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStartPreset('now')}
                  className="flex-1 text-[10px] h-7 px-1"
                >
                  ⚡ Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStartPreset('tomorrow')}
                  className="flex-1 text-[10px] h-7 px-1"
                >
                  🌅 Tmrw 9am
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStartPreset('monday')}
                  className="flex-1 text-[10px] h-7 px-1"
                >
                  📅 Mon 9am
                </Button>
              </div>
            </div>

            {/* 2. Emails Per Day */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-indigo-400" />
                  Emails Per Day
                </label>
                <Badge variant="default" className="text-xs font-mono">
                  {emailsPerDay} / day
                </Badge>
              </div>

              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={emailsPerDay}
                onChange={(e) => setEmailsPerDay(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />

              <div className="flex items-center justify-between gap-1 pt-1">
                {[25, 50, 100, 150, 200].map((preset) => (
                  <Button
                    key={preset}
                    variant={emailsPerDay === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEmailsPerDay(preset)}
                    className="flex-1 text-[10px] h-7 px-0 font-mono"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            {/* 3. Per-Mail Interval Delay */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Interval Delay
                </label>
                <Badge variant="info" className="text-xs font-mono">
                  {intervalSeconds}s delay
                </Badge>
              </div>

              <input
                type="range"
                min={10}
                max={300}
                step={5}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />

              <div className="flex items-center justify-between gap-1 pt-1">
                {[30, 45, 60, 90, 120].map((sec) => (
                  <Button
                    key={sec}
                    variant={intervalSeconds === sec ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIntervalSeconds(sec)}
                    className="flex-1 text-[10px] h-7 px-0 font-mono"
                  >
                    {sec}s
                  </Button>
                ))}
              </div>

              {/* Jitter */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <input
                  type="checkbox"
                  id="jitter"
                  checked={intervalJitterSeconds > 0}
                  onChange={(e) => setIntervalJitterSeconds(e.target.checked ? 10 : 0)}
                  className="accent-indigo-500 rounded w-3.5 h-3.5 cursor-pointer"
                />
                <label htmlFor="jitter" className="text-[11px] text-slate-400 cursor-pointer select-none">
                  ±10s human-like jitter
                </label>
              </div>
            </div>

            {/* 4. Batches Per Day */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Batches / Day
                </label>
                <Badge variant="warning" className="text-xs font-mono">
                  {batchesPerDay} batches
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[1, 2, 3, 4].map((b) => (
                  <Button
                    key={b}
                    variant={batchesPerDay === b ? 'amber' : 'outline'}
                    size="sm"
                    onClick={() => setBatchesPerDay(b)}
                    className="text-xs h-8 px-0"
                  >
                    {b} {b === 1 ? 'Batch' : 'Batches'}
                  </Button>
                ))}
              </div>

              {/* Workdays Only */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">Weekdays Only (Mon-Fri)</span>
                <button
                  type="button"
                  onClick={() => setWorkDaysOnly(!workDaysOnly)}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    workDaysOnly ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      workDaysOnly ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

          </div>

          {/* Batch Timing Windows */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Batch Delivery Windows</span>
              <span className="text-xs text-slate-500 font-normal">
                ({calculation.emailsPerBatch} emails per batch window)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeTimings.map((timing, idx) => (
                <div
                  key={timing.batchNumber}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {idx === 0 ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                      Batch #{timing.batchNumber}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {calculation.emailsPerBatch} emails
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Input
                      type="time"
                      value={timing.startTime}
                      onChange={(e) => updateTiming(idx, 'startTime', e.target.value)}
                      className="h-8 text-xs font-mono text-center px-1"
                    />
                    <span className="text-slate-500 text-xs">to</span>
                    <Input
                      type="time"
                      value={timing.endTime}
                      onChange={(e) => updateTiming(idx, 'endTime', e.target.value)}
                      className="h-8 text-xs font-mono text-center px-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projection Breakdown Cards */}
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-950 to-slate-900/50 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                  Schedule Projection Breakdown
                </h4>
              </div>
              <Badge variant="info">Smart Calculation Engine</Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Scheduled Start</span>
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-extrabold text-emerald-300">
                  {startDate}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  at {startTime} ({calculation.schedulePreview[0]?.dayOfWeek || 'Today'})
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Total Runtime</span>
                  <Clock className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {calculation.totalDaysToRun} <span className="text-sm font-normal text-slate-400">Days</span>
                </div>
                <div className="text-xs text-indigo-400 mt-1">
                  Ends ~{calculation.estimatedEndDate}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Batch Distribution</span>
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-extrabold text-cyan-300">
                  {calculation.emailsPerBatch} <span className="text-sm font-normal text-slate-400">/ batch</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {calculation.totalBatches} total planned batches
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Deliverability Health</span>
                  {calculation.deliverabilityScore === 'Optimal' || calculation.deliverabilityScore === 'Good' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {calculation.deliverabilityScore}
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  {calculation.deliverabilityAdvice}
                </div>
              </div>
            </div>

            {/* Timeline Preview Toggle */}
            {calculation.schedulePreview.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Projected Day-by-Day Timeline
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullTimeline(!showFullTimeline)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 gap-1"
                  >
                    <span>{showFullTimeline ? 'Show Less' : `View All ${calculation.totalDaysToRun} Days`}</span>
                    {showFullTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(showFullTimeline
                    ? calculation.schedulePreview
                    : calculation.schedulePreview.slice(0, 3)
                  ).map((day) => (
                    <div
                      key={day.dayNumber}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="font-bold text-white">
                          Day {day.dayNumber} ({day.dayOfWeek})
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">{day.dateStr}</span>
                      </div>

                      <div className="space-y-1.5">
                        {day.batches.map((b) => (
                          <div
                            key={b.batchNumber}
                            className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-lg text-slate-300"
                          >
                            <span>
                              Batch {b.batchNumber}: <strong className="text-cyan-300">{b.timeWindow}</strong>
                            </span>
                            <span className="text-slate-400 font-mono">
                              {b.emailCount} leads
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] text-slate-500 text-right">
                        Daily Total: {day.dailyTotal} emails
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Launch Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Ready to schedule{' '}
              <strong className="text-emerald-400">{calculation.validLeads.toLocaleString()}</strong> valid leads
              into Upstash queue across{' '}
              <strong className="text-white">{calculation.totalDaysToRun} days</strong>.
            </div>

            <Button
              variant="glowing"
              size="lg"
              onClick={handleLaunchCampaign}
              disabled={isLaunching || calculation.validLeads === 0}
              loading={isLaunching}
              loadingText="Launching Campaign..."
              className="gap-2 shadow-indigo-500/25 text-sm"
            >
              <Rocket className="w-4 h-4" />
              <span>Initialize & Launch Campaign</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Step Launch Loading Modal */}
      <Dialog open={isLaunching} onOpenChange={() => {}}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <Rocket className="w-5 h-5 text-indigo-400 animate-bounce" />
              <span>Launching Campaign</span>
            </DialogTitle>
            <DialogDescription>
              Initializing your asynchronous outreach queue...
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3">
              {launchStep > 1 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
              )}
              <span className={`text-xs ${launchStep >= 1 ? 'text-white font-semibold' : 'text-slate-500'}`}>
                1. Validating leads & calculating batch distribution
              </span>
            </div>

            <div className="flex items-center gap-3">
              {launchStep > 2 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : launchStep === 2 ? (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className={`text-xs ${launchStep >= 2 ? 'text-white font-semibold' : 'text-slate-500'}`}>
                2. Saving jobs to MongoDB Atlas
              </span>
            </div>

            <div className="flex items-center gap-3">
              {launchStep > 3 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : launchStep === 3 ? (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className={`text-xs ${launchStep >= 3 ? 'text-white font-semibold' : 'text-slate-500'}`}>
                3. Enqueuing 7-day rolling window to Upstash QStash
              </span>
            </div>

            <div className="flex items-center gap-3">
              {launchStep === 4 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
              )}
              <span className={`text-xs ${launchStep === 4 ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                4. Live! Redirecting to Queue Monitor...
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
