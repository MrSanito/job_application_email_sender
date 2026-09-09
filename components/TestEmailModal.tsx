'use client';

import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface TestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectTemplate: string;
  bodyTemplate: string;
}

export default function TestEmailModal({
  isOpen,
  onClose,
  subjectTemplate,
  bodyTemplate,
}: TestEmailModalProps) {
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('Hiring Manager');
  const [testCompany, setTestCompany] = useState('Acme Technologies');
  const [testRole, setTestRole] = useState('Senior Full Stack Engineer');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; isSimulated?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    try {
      setIsSending(true);
      setResult(null);

      const res = await fetch('/api/queue/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subjectTemplate,
          bodyTemplate,
          testData: {
            name: testName,
            company: testCompany,
            catName: testRole,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send test email.');
      }

      setResult({
        success: true,
        isSimulated: data.isSimulated,
        message: data.isSimulated
          ? `Async simulated email dispatched successfully (${data.latencyMs}ms)! In simulation mode, no live SMTP is needed.`
          : `Live test email dispatched successfully via SMTP to ${testEmail}!`,
      });
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error sending test email',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center text-cyan-400 border border-indigo-800/40">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Send Test Outreach Email</h4>
              <p className="text-[11px] text-slate-400">Verify email tags and delivery formatting</p>
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

        {/* Form */}
        <form onSubmit={handleSendTest} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Send Test To Email:
            </label>
            <input
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="e.g. your-email@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Sample Contact Name:
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Sample Company:
              </label>
              <input
                type="text"
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white outline-none"
              />
            </div>
          </div>

          {/* Feedback banner */}
          {result && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                result.success
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
            >
              {isSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Dispatch Test Email
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
