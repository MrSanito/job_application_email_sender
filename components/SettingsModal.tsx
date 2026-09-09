'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Zap, 
  Database, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  Bot,
  Sparkles,
  Server,
  Shuffle
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{
    success: boolean;
    message: string;
    totalKeys?: number;
    totalModels?: number;
    results?: Array<{ keyNumber: number; model?: string; success: boolean; message: string }>;
  } | null>(null);
  const [mongoTestStatus, setMongoTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [qstashTestStatus, setQstashTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [testingService, setTestingService] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      console.error('Config fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const runTest = async (action: 'smtp' | 'gemini' | 'mongo' | 'qstash') => {
    try {
      setTestingService(action);
      if (action === 'smtp') setTestStatus(null);
      if (action === 'gemini') setGeminiTestStatus(null);
      if (action === 'mongo') setMongoTestStatus(null);
      if (action === 'qstash') setQstashTestStatus(null);

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (action === 'smtp') setTestStatus(data.smtp);
      if (action === 'gemini') setGeminiTestStatus(data.gemini);
      if (action === 'mongo') setMongoTestStatus(data.mongo);
      if (action === 'qstash') setQstashTestStatus(data.qstash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      if (action === 'smtp') setTestStatus({ success: false, message: msg });
      if (action === 'gemini') setGeminiTestStatus({ success: false, message: msg });
      if (action === 'mongo') setMongoTestStatus({ success: false, message: msg });
      if (action === 'qstash') setQstashTestStatus({ success: false, message: msg });
    } finally {
      setTestingService(null);
    }
  };

  if (!isOpen) return null;

  const geminiKeysCount = Number(config?.geminiKeysCount || (config?.hasGemini ? 1 : 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center text-cyan-400 border border-indigo-800/40">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">System & Cloud Integrations</h4>
              <p className="text-[11px] text-slate-400">MongoDB Atlas, Upstash QStash, Multi-Key Gemini AI, and SMTP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Integration Status Cards */}
        <div className="space-y-3 text-xs">

          {/* 1. Google Gemini AI + LangChain (Multi-Key & Multi-Model Rotation) */}
          <div className="p-3.5 bg-slate-950/70 border border-indigo-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Google GenAI + LangChain</span>
              </div>
              {geminiKeysCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                  <Shuffle className="w-3 h-3 text-cyan-400" />
                  {geminiKeysCount} Keys × 5 Models (Random Rotation)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800/40">
                  Missing Key
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Randomly balances on-the-spot email generation requests across configured API keys and verified Gemini models (<code className="text-cyan-300">gemini-2.5-flash</code>, <code className="text-cyan-300">gemini-3.5-flash-lite</code>, <code className="text-cyan-300">gemini-flash-lite-latest</code>, etc.) with automatic failover.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].map((m) => (
                <span key={m} className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-[10px] font-mono text-cyan-300">
                  {m}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => runTest('gemini')}
              disabled={testingService === 'gemini'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 rounded-lg text-xs transition-colors"
            >
              {testingService === 'gemini' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-cyan-400" />}
              Test All Gemini API Keys & Models
            </button>

            {geminiTestStatus && (
              <div className="space-y-1.5">
                <div
                  className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                    geminiTestStatus.success
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  }`}
                >
                  {geminiTestStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                  <span>{geminiTestStatus.message}</span>
                </div>

                {geminiTestStatus.results && geminiTestStatus.results.map((r, idx) => (
                  <div key={idx} className="text-[10px] px-2 py-1 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Key #{r.keyNumber} ({r.model || 'flash'}):</span>
                    <span className={r.success ? 'text-emerald-400' : 'text-rose-400'}>{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. MongoDB Atlas */}
          <div className="p-3.5 bg-slate-950/70 border border-emerald-800/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>MongoDB Atlas Database</span>
              </div>
              {config?.hasMongo ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800/40">
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Stores all campaigns, sent email logs, exact timestamps, and recipient details in collections{' '}
              <code className="text-emerald-300">campaigns</code> and <code className="text-emerald-300">email_logs</code>.
            </p>

            <button
              type="button"
              onClick={() => runTest('mongo')}
              disabled={testingService === 'mongo'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 rounded-lg text-xs transition-colors"
            >
              {testingService === 'mongo' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3 text-emerald-400" />}
              Test MongoDB Connection
            </button>

            {mongoTestStatus && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  mongoTestStatus.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}
              >
                {mongoTestStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>{mongoTestStatus.message}</span>
              </div>
            )}
          </div>

          {/* 3. Upstash QStash */}
          <div className="p-3.5 bg-slate-950/70 border border-amber-800/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Upstash QStash (Async Background Queues)</span>
              </div>
              {config?.hasQstash ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3" /> Token Loaded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800/40">
                  ⚡ Simulation Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Dispatches delayed webhooks to <code className="text-amber-300">/api/queue/dispatch</code> with custom intervals.
            </p>

            <button
              type="button"
              onClick={() => runTest('qstash')}
              disabled={testingService === 'qstash'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/50 hover:bg-amber-900/50 border border-amber-700/50 text-amber-300 rounded-lg text-xs transition-colors"
            >
              {testingService === 'qstash' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-400" />}
              Test QStash Client
            </button>

            {qstashTestStatus && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  qstashTestStatus.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}
              >
                {qstashTestStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>{qstashTestStatus.message}</span>
              </div>
            )}
          </div>

          {/* 4. SMTP Mailer */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Nodemailer SMTP Transporter</span>
              </div>
              {config?.hasSmtp ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800/40">
                  Simulated Dispatch
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => runTest('smtp')}
              disabled={testingService === 'smtp'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
            >
              {testingService === 'smtp' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
              Verify SMTP Connection
            </button>

            {testStatus && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  testStatus.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}
              >
                {testStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

        </div>

        <div className="text-right pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
