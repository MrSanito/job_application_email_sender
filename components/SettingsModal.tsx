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
  const [mistralTestStatus, setMistralTestStatus] = useState<{
    success: boolean;
    mistralActive?: boolean;
    tavilyActive?: boolean;
    workingModels?: string[];
    totalKeys?: number;
    message: string;
    sampleResponse?: string;
    tavilySnippet?: string;
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

  const runTest = async (action: 'smtp' | 'mistral' | 'mongo' | 'qstash') => {
    try {
      setTestingService(action);
      if (action === 'smtp') setTestStatus(null);
      if (action === 'mistral') setMistralTestStatus(null);
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
      if (action === 'mistral') {
        const mStatus = data.mistral;
        setMistralTestStatus(mStatus);
        if (mStatus?.success) toast.success('Mistral AI & Tavily Search verified!');
        else toast.error(mStatus?.message || 'Mistral test failed');
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
      if (action === 'mistral') setMistralTestStatus({ success: false, message: msg });
      if (action === 'mongo') setMongoTestStatus({ success: false, message: msg });
      if (action === 'qstash') setQstashTestStatus({ success: false, message: msg });
    } finally {
      setTestingService(null);
    }
  };

  const hasMistral = Boolean(config?.hasMistral);
  const hasTavily = Boolean(config?.hasTavily);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>System & Cloud Integrations</span>
          </DialogTitle>
          <DialogDescription>
            MongoDB Atlas, Upstash QStash, Mistral AI + Tavily Web Intelligence, and SMTP connection verification.
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
            {/* 1. Mistral AI + Tavily Web Search */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>Mistral AI + Tavily Web Intelligence</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasMistral ? (
                    <Badge variant="purple" dot className="text-xs">
                      Mistral Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive" dot className="text-xs">No Mistral Key</Badge>
                  )}
                  {hasTavily ? (
                    <Badge variant="success" dot className="text-xs">
                      Tavily Search
                    </Badge>
                  ) : (
                    <Badge variant="destructive" dot className="text-xs">No Tavily Key</Badge>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Tavily performs live web searches for company background & product details, then feeds real-time context into Mistral AI to craft hyper-personalized cold outreach emails.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {['open-mistral-7b', 'open-mistral-nemo', 'ministral-8b-latest', 'mistral-tiny', 'ministral-3b-latest', 'codestral-latest'].map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/40 text-[10px] font-mono text-cyan-300">
                    {m}
                  </span>
                ))}
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runTest('mistral')}
                  loading={testingService === 'mistral'}
                  loadingText="Testing Mistral AI & Tavily..."
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Test Mistral AI & Tavily Search
                </Button>
              </div>

              {mistralTestStatus && (
                <div className="space-y-2 pt-1">
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    mistralTestStatus.success
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  }`}>
                    {mistralTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{mistralTestStatus.message}</span>
                  </div>

                  {mistralTestStatus.workingModels && mistralTestStatus.workingModels.length > 0 && (
                    <div className="text-[11px] px-3 py-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-slate-400">Active Mistral Models:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mistralTestStatus.workingModels.map((m) => (
                          <span key={m} className="px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 rounded font-mono text-[10px]">
                            ✓ {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {mistralTestStatus.tavilySnippet && (
                    <div className="text-[11px] px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-300">
                      <span className="text-cyan-400 font-semibold">Tavily Sample: </span>
                      {mistralTestStatus.tavilySnippet}
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
