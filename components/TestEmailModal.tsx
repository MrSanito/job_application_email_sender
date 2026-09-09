'use client';

import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
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

      const msg = data.isSimulated
        ? `Async simulated email dispatched successfully (${data.latencyMs}ms)!`
        : `Live test email dispatched successfully via SMTP to ${testEmail}!`;

      setResult({
        success: true,
        isSimulated: data.isSimulated,
        message: msg,
      });
      toast.success(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending test email';
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            <Mail className="w-5 h-5 text-indigo-400" />
            <span>Send Test Outreach Email</span>
          </DialogTitle>
          <DialogDescription>
            Verify template variable replacements, formatting, and live SMTP delivery.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSendTest} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Recipient Email Address
            </label>
            <Input
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="e.g. your-email@gmail.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Contact Name
              </label>
              <Input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Company
              </label>
              <Input
                type="text"
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Role / Category
            </label>
            <Input
              type="text"
              value={testRole}
              onChange={(e) => setTestRole(e.target.value)}
            />
          </div>

          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                result.success
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              loading={isSending}
              loadingText="Dispatching..."
              className="gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
