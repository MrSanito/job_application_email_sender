'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Send, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight,
  Zap,
  Activity
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
    <div className="min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenQStashTest={() => setIsQstashTestOpen(true)}
        hasActiveCampaign={hasActiveCampaign}
        isSimulated={isSimulated}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-slate-800/80 p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-gradient-to-bl from-cyan-500/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs px-3 py-1 gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Step 1: Lead Ingestion & Calendar Planner</span>
              </Badge>
              <Badge variant="purple" className="text-xs px-3 py-1">
                LangChain Google GenAI
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Cold Outreach Parser &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                Async Batch Engine
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Ingest contacts from spreadsheets, compose dynamic variable templates, customize on-the-spot Gemini AI pitches, and let the smart calculator organize your daily delivery quotas and delay intervals.
            </p>

            {/* Quick Metrics Pill Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 shadow-sm">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <span>Parsed Contacts: <strong className="text-white font-bold">{leads.length.toLocaleString()}</strong></span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ready to Email: <strong className="text-white font-bold">{validLeadsCount.toLocaleString()}</strong></span>
              </div>

              <Button
                variant="amber"
                size="sm"
                onClick={() => setIsQstashTestOpen(true)}
                className="gap-1.5 text-xs h-9"
              >
                <Clock className="w-3.5 h-3.5 text-slate-950" />
                <span>Test 1-Min Upstash Queue</span>
              </Button>

              {hasActiveCampaign && (
                <Link href="/queue">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-9 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Live Campaign Running</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
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

        {/* 4. Smart Campaign Scheduler & Calculator */}
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
