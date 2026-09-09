'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ExcelUploader from '@/components/ExcelUploader';
import LeadsTable from '@/components/LeadsTable';
import EmailTemplateEditor from '@/components/EmailTemplateEditor';
import CampaignScheduler from '@/components/CampaignScheduler';
import SettingsModal from '@/components/SettingsModal';
import TestEmailModal from '@/components/TestEmailModal';
import TestQStashModal from '@/components/TestQStashModal';
import { Lead } from '@/types';
import { ParseResult } from '@/lib/excel-parser';
import { DEFAULT_BODY_TEMPLATE, DEFAULT_SUBJECT_TEMPLATE } from '@/lib/template-engine';
import { 
  Sparkles, 
  Send, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Calendar,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';

export default function LeadsPlannerPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [subjectTemplate, setSubjectTemplate] = useState(DEFAULT_SUBJECT_TEMPLATE);
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY_TEMPLATE);
  const [selectedLeadForPreview, setSelectedLeadForPreview] = useState<Lead | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [isQstashTestOpen, setIsQstashTestOpen] = useState(false);
  const [hasActiveCampaign, setHasActiveCampaign] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true);

  // Check if a campaign already exists on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/campaign/status');
        const data = await res.json();
        if (data.hasActiveCampaign) {
          setHasActiveCampaign(true);
        }

        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        if (configData.success) {
          setIsSimulated(configData.config.isSimulationMode);
        }
      } catch (e) {
        console.warn('Initial check error:', e);
      }
    }
    checkStatus();
  }, []);

  const handleLeadsLoaded = (newLeads: Lead[], stats: ParseResult['stats']) => {
    setLeads(newLeads);
    const firstValid = newLeads.find((l) => l.status === 'valid') || newLeads[0];
    if (firstValid) {
      setSelectedLeadForPreview(firstValid);
    }
  };

  const validLeadsCount = leads.filter((l) => l.status === 'valid').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQStashTest={() => setIsQstashTestOpen(true)}
        hasActiveCampaign={hasActiveCampaign}
        isSimulated={isSimulated}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-slate-800 p-8 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step 1: Ingest Leads & Configure Schedule</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Cold Email Lead Parser &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                Async Batch Scheduler
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Upload your lead spreadsheet to automatically parse contacts, customize dynamic templates, 
              and figure out your optimal daily sending quotas, per-email delay intervals, and total campaign duration in days.
            </p>

            {/* Quick Metrics Pill Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Parsed Leads: <strong className="text-white">{leads.length.toLocaleString()}</strong></span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ready to Email: <strong className="text-white">{validLeadsCount.toLocaleString()}</strong></span>
              </div>

              <button
                type="button"
                onClick={() => setIsQstashTestOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Test 1-Min Upstash Queue</span>
              </button>

              {hasActiveCampaign && (
                <a
                  href="/queue"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-600/30 transition-colors"
                >
                  <span>Active Campaign Running</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 1. Excel Uploader */}
        <section>
          <ExcelUploader
            onLeadsLoaded={handleLeadsLoaded}
            leadsCount={leads.length}
          />
        </section>

        {/* 2. Leads Data Table Preview (if leads loaded) */}
        {leads.length > 0 && (
          <section>
            <LeadsTable
              leads={leads}
              onSelectLeadForPreview={(lead) => setSelectedLeadForPreview(lead)}
            />
          </section>
        )}

        {/* 3. Email Template Composer */}
        <section>
          <EmailTemplateEditor
            subjectTemplate={subjectTemplate}
            bodyTemplate={bodyTemplate}
            onSubjectChange={setSubjectTemplate}
            onBodyChange={setBodyTemplate}
            previewLead={selectedLeadForPreview}
            onOpenTestEmailModal={() => setIsTestEmailOpen(true)}
          />
        </section>

        {/* 4. Smart Campaign Scheduler & Calculator (Figure it out) */}
        <section>
          <CampaignScheduler
            leads={leads}
            subjectTemplate={subjectTemplate}
            bodyTemplate={bodyTemplate}
          />
        </section>

      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <TestEmailModal
        isOpen={isTestEmailOpen}
        onClose={() => setIsTestEmailOpen(false)}
        subjectTemplate={subjectTemplate}
        bodyTemplate={bodyTemplate}
      />

      <TestQStashModal
        isOpen={isQstashTestOpen}
        onClose={() => setIsQstashTestOpen(false)}
      />
    </div>
  );
}
