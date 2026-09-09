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
  HelpCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Timer
} from 'lucide-react';
import { CampaignCalculation, CampaignConfig, Lead } from '@/types';
import { calculateCampaignPlan } from '@/lib/scheduler-calc';

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
  const [launchError, setLaunchError] = useState<string | null>(null);

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
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
      setStartTime('09:00');
    } else if (preset === 'monday') {
      const dayOfWeek = d.getDay();
      const daysUntilNextMonday = ((1 + 7 - dayOfWeek) % 7) || 7;
      d.setDate(d.getDate() + daysUntilNextMonday);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
      setStartTime('09:00');
    }
  };

  // Dynamic batch timings
  const [batchTimings, setBatchTimings] = useState([
    { batchNumber: 1, startTime: '09:00', endTime: '12:00' },
    { batchNumber: 2, startTime: '14:00', endTime: '17:00' },
    { batchNumber: 3, startTime: '18:00', endTime: '20:00' },
    { batchNumber: 4, startTime: '21:00', endTime: '23:00' },
  ]);

  // Adjust timing slots when batchesPerDay changes
  const activeTimings = useMemo(() => {
    return batchTimings.slice(0, batchesPerDay);
  }, [batchTimings, batchesPerDay]);

  const updateTiming = (index: number, field: 'startTime' | 'endTime', val: string) => {
    const updated = [...batchTimings];
    updated[index] = { ...updated[index], [field]: val };
    setBatchTimings(updated);
  };

  // Compile full config
  const campaignConfig: CampaignConfig = useMemo(() => {
    return {
      campaignName,
      senderName: 'Vishal Nishad',
      senderEmail: 'vishalni2005@gmail.com',
      candidateName: 'Vishal Nishad',
      candidateRole: 'Full-Stack Developer',
      candidatePortfolio: 'https://zynito.in',
      candidateSkills: 'Next.js, React, Node.js, TypeScript, PostgreSQL, MongoDB, Redis, BullMQ, AI Voice & Calling Agents (Pipecat, Gemini, Plivo, STT/TTS)',
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

  // Real-time calculation engine
  const calculation: CampaignCalculation = useMemo(() => {
    return calculateCampaignPlan(leads, campaignConfig);
  }, [leads, campaignConfig]);

  // Launch Campaign
  const handleLaunchCampaign = async () => {
    if (calculation.validLeads === 0) {
      setLaunchError('Please upload leads with valid email addresses before launching.');
      return;
    }

    try {
      setIsLaunching(true);
      setLaunchError(null);

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

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      // Celebrate launch!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        router.push('/queue');
      }, 800);
    } catch (err: unknown) {
      setLaunchError(err instanceof Error ? err.message : 'Failed to launch campaign');
      setIsLaunching(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            Smart Campaign Scheduler & Delivery Calculator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure daily sending volume, intervals, batch windows, and calculate total runtime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign Name"
            className="bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-64"
          />
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Start Date & Time */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Start Date & Time
            </label>
            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-700/40">
              {startDate} @ {startTime}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Date</label>
              <input
                type="date"
                value={startDate}
                min={getTodayStr()}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
              />
            </div>
          </div>

          {/* Quick Start Presets */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setStartPreset('now')}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border border-slate-800 hover:border-emerald-800 transition-colors flex-1 text-center"
            >
              ⚡ Now
            </button>
            <button
              type="button"
              onClick={() => setStartPreset('tomorrow')}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border border-slate-800 hover:border-emerald-800 transition-colors flex-1 text-center"
            >
              🌅 Tmrw 9am
            </button>
            <button
              type="button"
              onClick={() => setStartPreset('monday')}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border border-slate-800 hover:border-emerald-800 transition-colors flex-1 text-center"
            >
              📅 Mon 9am
            </button>
          </div>
        </div>

        {/* 2. Emails Per Day */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-indigo-400" />
              Emails Per Day
            </label>
            <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 font-mono text-xs font-bold border border-indigo-700/40">
              {emailsPerDay} / day
            </span>
          </div>

          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={emailsPerDay}
            onChange={(e) => setEmailsPerDay(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />

          <div className="flex items-center justify-between gap-1 pt-1">
            {[25, 50, 100, 150, 200].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setEmailsPerDay(preset)}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-mono transition-colors flex-1 text-center ${
                  emailsPerDay === preset
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Per-Mail Interval Delay */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Interval Delay
            </label>
            <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 font-mono text-xs font-bold border border-cyan-700/40">
              {intervalSeconds}s delay
            </span>
          </div>

          <input
            type="range"
            min={10}
            max={300}
            step={5}
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />

          <div className="flex items-center justify-between gap-1 pt-1">
            {[30, 45, 60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setIntervalSeconds(sec)}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-mono transition-colors flex-1 text-center ${
                  intervalSeconds === sec
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Random Jitter checkbox */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/60">
            <input
              type="checkbox"
              id="jitter"
              checked={intervalJitterSeconds > 0}
              onChange={(e) => setIntervalJitterSeconds(e.target.checked ? 10 : 0)}
              className="accent-indigo-500 rounded w-3 h-3"
            />
            <label htmlFor="jitter" className="text-[10px] text-slate-400 cursor-pointer">
              ±10s human-like jitter
            </label>
          </div>
        </div>

        {/* 4. Batches Per Day */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Batches / Day
            </label>
            <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 font-mono text-xs font-bold border border-amber-700/40">
              {batchesPerDay} batches
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[1, 2, 3, 4].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBatchesPerDay(b)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  batchesPerDay === b
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {b} {b === 1 ? 'Batch' : 'Batches'}
              </button>
            ))}
          </div>

          {/* Workdays Only toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-400">Weekdays Only (Mon-Fri)</span>
            <button
              type="button"
              onClick={() => setWorkDaysOnly(!workDaysOnly)}
              className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${
                workDaysOnly ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  workDaysOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

      </div>

      {/* Batch Timing Windows Configurator */}
      <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Batch Schedule Windows</span>
          <span className="text-[11px] text-slate-500 lowercase">
            ({calculation.emailsPerBatch} emails per batch window)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeTimings.map((timing, idx) => (
            <div
              key={timing.batchNumber}
              className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  {idx === 0 ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : idx === 1 ? (
                    <Sun className="w-3.5 h-3.5 text-orange-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  Batch #{timing.batchNumber}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {calculation.emailsPerBatch} emails
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="time"
                  value={timing.startTime}
                  onChange={(e) => updateTiming(idx, 'startTime', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 font-mono text-xs w-full text-center"
                />
                <span className="text-slate-600">to</span>
                <input
                  type="time"
                  value={timing.endTime}
                  onChange={(e) => updateTiming(idx, 'endTime', e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 font-mono text-xs w-full text-center"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CALCULATED PROJECTION METRICS (FIGURE IT OUT) */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Campaign Projection Breakdown
            </h4>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
            Auto Calculated
          </span>
        </div>

        {/* 4 Core Calculation Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Scheduled Start */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Scheduled Start</span>
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-300 tracking-tight">
              {startDate}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              at {startTime} ({calculation.schedulePreview[0]?.dayOfWeek || 'Today'})
            </div>
          </div>

          {/* 2. Total Days */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Runtime</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {calculation.totalDaysToRun}{' '}
              <span className="text-sm font-normal text-slate-400">Days</span>
            </div>
            <div className="text-[11px] text-indigo-400 font-medium mt-1">
              Completes ~{calculation.estimatedEndDate}
            </div>
          </div>

          {/* 3. Emails Per Batch */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Batch Distribution</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-cyan-300 tracking-tight">
              {calculation.emailsPerBatch}{' '}
              <span className="text-sm font-normal text-slate-400">/ batch</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {calculation.totalBatches} total scheduled batches
            </div>
          </div>

          {/* 4. Deliverability Score */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Deliverability Score</span>
              {calculation.deliverabilityScore === 'Optimal' || calculation.deliverabilityScore === 'Good' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                calculation.deliverabilityScore === 'Optimal'
                  ? 'text-emerald-400'
                  : calculation.deliverabilityScore === 'Good'
                  ? 'text-cyan-400'
                  : calculation.deliverabilityScore === 'High Volume'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {calculation.deliverabilityScore}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {calculation.deliverabilityAdvice}
            </div>
          </div>

        </div>

        {/* Timeline Preview Toggle & List */}
        {calculation.schedulePreview.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Day-by-Day Schedule Projection
              </span>
              <button
                type="button"
                onClick={() => setShowFullTimeline(!showFullTimeline)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {showFullTimeline ? (
                  <>
                    <span>Hide Timeline</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>View All {calculation.totalDaysToRun} Days Timeline</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Display first 3 days or all days */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(showFullTimeline
                ? calculation.schedulePreview
                : calculation.schedulePreview.slice(0, 3)
              ).map((day) => (
                <div
                  key={day.dayNumber}
                  className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="font-bold text-white">
                      Day {day.dayNumber} ({day.dayOfWeek})
                    </span>
                    <span className="text-[11px] text-slate-400">{day.dateStr}</span>
                  </div>

                  <div className="space-y-1">
                    {day.batches.map((b) => (
                      <div
                        key={b.batchNumber}
                        className="flex items-center justify-between text-[11px] bg-slate-950/60 p-1.5 rounded-lg text-slate-300"
                      >
                        <span>
                          Batch {b.batchNumber}: <strong className="text-cyan-300">{b.timeWindow}</strong>
                        </span>
                        <span className="text-slate-400 font-mono">
                          {b.emailCount} leads ({b.leadRange})
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

      {/* Launch Error */}
      {launchError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{launchError}</span>
        </div>
      )}

      {/* Launch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-400">
          Ready to queue{' '}
          <strong className="text-emerald-400">{calculation.validLeads.toLocaleString()}</strong> valid leads
          into Upstash asynchronous queue across{' '}
          <strong className="text-white">{calculation.totalDaysToRun} days</strong>.
        </div>

        <button
          type="button"
          onClick={handleLaunchCampaign}
          disabled={isLaunching || calculation.validLeads === 0}
          className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
        >
          <Rocket className="w-4 h-4" />
          {isLaunching ? 'Scheduling to Upstash Queue...' : 'Queue & Launch Campaign Now'}
        </button>
      </div>

    </div>
  );
}
