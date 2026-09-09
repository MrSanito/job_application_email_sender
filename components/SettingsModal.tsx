'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
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
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
      toast.error('Failed to load system configuration');
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

      if (action === 'smtp') {
        setTestStatus(data.smtp);
        if (data.smtp?.success) toast.success('SMTP server connection verified!');
        else toast.error(data.smtp?.message || 'SMTP test failed');
      }
      if (action === 'gemini') {
        setGeminiTestStatus(data.gemini);
        if (data.gemini?.success) toast.success('All Gemini API keys & models verified!');
        else toast.error(data.gemini?.message || 'Gemini test failed');
      }
      if (action === 'mongo') {
        setMongoTestStatus(data.mongo);
        if (data.mongo?.success) toast.success('MongoDB Atlas connected!');
        else toast.error(data.mongo?.message || 'MongoDB test failed');
      }
      if (action === 'qstash') {
        setQstashTestStatus(data.qstash);
        if (data.qstash?.success) toast.success('Upstash QStash token verified!');
        else toast.error(data.qstash?.message || 'QStash test failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      toast.error(msg);
      if (action === 'smtp') setTestStatus({ success: false, message: msg });
      if (action === 'gemini') setGeminiTestStatus({ success: false, message: msg });
      if (action === 'mongo') setMongoTestStatus({ success: false, message: msg });
      if (action === 'qstash') setQstashTestStatus({ success: false, message: msg });
    } finally {
      setTestingService(null);
    }
  };

  const geminiKeysCount = Number(config?.geminiKeysCount || (config?.hasGemini ? 1 : 0));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>System & Cloud Integrations</span>
          </DialogTitle>
          <DialogDescription>
            MongoDB Atlas, Upstash QStash, Multi-Key Gemini AI, and SMTP connection verification.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* 1. Google Gemini AI */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>Google GenAI + LangChain</span>
                </div>
                {geminiKeysCount > 0 ? (
                  <Badge variant="purple" dot className="text-xs">
                    <Shuffle className="w-3 h-3 mr-1" />
                    {geminiKeysCount} Keys × 5 Models Rotation
                  </Badge>
                ) : (
                  <Badge variant="destructive" dot>Missing Key</Badge>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Balances email generation requests across configured API keys and verified Gemini models with automatic failover.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'].map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-[10px] font-mono text-cyan-300">
                    {m}
                  </span>
                ))}
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('gemini')}
                  loading={testingService === 'gemini'}
                  loadingText="Testing Gemini Rotation..."
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Test All Gemini API Keys & Models
                </Button>
              </div>

              {geminiTestStatus && (
                <div className="space-y-2 pt-1">
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    geminiTestStatus.success
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  }`}>
                    {geminiTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{geminiTestStatus.message}</span>
                  </div>

                  {geminiTestStatus.results && (
                    <div className="space-y-1">
                      {geminiTestStatus.results.map((r, idx) => (
                        <div key={idx} className="text-[11px] px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-300 font-mono">Key #{r.keyNumber} ({r.model || 'flash'}):</span>
                          <span className={r.success ? 'text-emerald-400 font-medium' : 'text-rose-400'}>{r.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. MongoDB Atlas */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>MongoDB Atlas Database</span>
                </div>
                {config?.hasMongo ? (
                  <Badge variant="success" dot className="text-xs">Connected</Badge>
                ) : (
                  <Badge variant="destructive" dot className="text-xs">Not Configured</Badge>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Stores all campaigns, sent email logs, exact timestamps, and recipient details in collections <code className="text-emerald-300">campaigns</code> and <code className="text-emerald-300">email_logs</code>.
              </p>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('mongo')}
                  loading={testingService === 'mongo'}
                  loadingText="Connecting to Atlas..."
                  className="text-xs border-emerald-700/50 text-emerald-300 hover:bg-emerald-950/50"
                >
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  Test MongoDB Connection
                </Button>
              </div>

              {mongoTestStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  mongoTestStatus.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}>
                  {mongoTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{mongoTestStatus.message}</span>
                </div>
              )}
            </div>

            {/* 3. Upstash QStash */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Upstash QStash (Async Background Queues)</span>
                </div>
                {config?.hasQstash ? (
                  <Badge variant="success" dot className="text-xs">Token Loaded</Badge>
                ) : (
                  <Badge variant="warning" dot className="text-xs">Simulation Mode</Badge>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Dispatches timed jobs through named queue <code className="text-amber-300">email_job_queue</code> to <code className="text-amber-300">/api/queue/dispatch</code>.
              </p>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('qstash')}
                  loading={testingService === 'qstash'}
                  loadingText="Testing QStash..."
                  className="text-xs border-amber-700/50 text-amber-300 hover:bg-amber-950/50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Test QStash Client
                </Button>
              </div>

              {qstashTestStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  qstashTestStatus.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}>
                  {qstashTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{qstashTestStatus.message}</span>
                </div>
              )}
            </div>

            {/* 4. SMTP Mailer */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Nodemailer SMTP Transporter</span>
                </div>
                {config?.hasSmtp ? (
                  <Badge variant="success" dot className="text-xs">Active</Badge>
                ) : (
                  <Badge variant="warning" dot className="text-xs">Simulated</Badge>
                )}
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('smtp')}
                  loading={testingService === 'smtp'}
                  loadingText="Verifying SMTP..."
                  className="text-xs border-slate-700"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verify SMTP Connection
                </Button>
              </div>

              {testStatus && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testStatus.success
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                }`}>
                  {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="default" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
