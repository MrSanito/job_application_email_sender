'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Eye, 
  Code, 
  Tag, 
  Send,
  User, 
  Building, 
  Briefcase, 
  Mail, 
  MapPin,
  Bot,
  RefreshCw,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import { Lead } from '@/types';
import { renderTemplate } from '@/lib/template-engine';

interface EmailTemplateEditorProps {
  subjectTemplate: string;
  bodyTemplate: string;
  onSubjectChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  previewLead?: Lead | null;
  onOpenTestEmailModal: () => void;
}

const TEMPLATE_VARIABLES = [
  { tag: '{{name}}', label: 'Contact Name', icon: User },
  { tag: '{{company}}', label: 'Company Name', icon: Building },
  { tag: '{{catName}}', label: 'Job Role / Industry', icon: Briefcase },
  { tag: '{{email}}', label: 'Recipient Email', icon: Mail },
  { tag: '{{address}}', label: 'Location / City', icon: MapPin },
];

export default function EmailTemplateEditor({
  subjectTemplate,
  bodyTemplate,
  onSubjectChange,
  onBodyChange,
  previewLead,
  onOpenTestEmailModal,
}: EmailTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'ai'>('editor');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  const sampleLead: Lead = previewLead || {
    id: 'sample-1',
    name: 'Sarah Connor',
    email: 'hiring@cyberdyne-ai.com',
    company: 'Cyberdyne AI Systems',
    catName: 'Senior Full Stack & AI Systems Architect',
    address: 'San Francisco, CA',
    status: 'valid',
  };

  const renderedSubject = renderTemplate(subjectTemplate, sampleLead);
  const renderedBody = renderTemplate(bodyTemplate, sampleLead);

  const insertTagToBody = (tag: string) => {
    onBodyChange(bodyTemplate + '\n' + tag);
  };

  // Generate on-the-spot personalized email using LangChain & Gemini
  const handleGenerateOnTheSpotWithAi = async () => {
    try {
      setIsGeneratingAi(true);
      setAiStatusMessage(null);

      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: sampleLead,
          candidateProfile: {
            name: 'Vishal',
            role: 'Senior Full Stack & AI Engineer',
            skills: 'Next.js, React, Node.js, TypeScript, Python, AI Agents, Upstash/Redis, Distributed Microservices',
            portfolioUrl: 'https://github.com/vishal',
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'AI generation failed');
      }

      onSubjectChange(data.subject);
      onBodyChange(data.textBody || data.htmlBody.replace(/<[^>]*>?/gm, ''));
      setAiStatusMessage(
        `Generated on-the-spot via ${data.modelUsed || 'Google Gemini AI'} in ${data.latencyMs}ms!`
      );
      setActiveTab('preview');
    } catch (err: unknown) {
      setAiStatusMessage(
        err instanceof Error ? `Error: ${err.message}` : 'Failed to generate with AI'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Dynamic Email Generator & Template
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              <Bot className="w-3 h-3 text-cyan-400" />
              Google GenAI + LangChain Enabled
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalize on-the-spot using Google Gemini AI or customize your base templates.
          </p>
        </div>

        {/* Action / View Tabs & AI Generate */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click AI Generator Button */}
          <button
            type="button"
            onClick={handleGenerateOnTheSpotWithAi}
            disabled={isGeneratingAi}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-indigo-600/30 hover:scale-[1.02] disabled:opacity-50 transition-all"
          >
            {isGeneratingAi ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-cyan-200" />
            )}
            <span>Generate with Gemini AI</span>
          </button>

          <div className="flex items-center bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenTestEmailModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Send Test
          </button>
        </div>
      </div>

      {/* AI Success / Status Toast */}
      {aiStatusMessage && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/60 to-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>{aiStatusMessage}</span>
          </div>
          <button
            onClick={() => setAiStatusMessage(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic Variable Pills */}
      <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
          <Tag className="w-3 h-3 text-indigo-400" />
          Quick Variable Insertion:
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertTagToBody(v.tag)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/30 text-xs font-mono transition-colors group"
                title={`Click to insert ${v.label}`}
              >
                <Icon className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>{v.tag}</span>
                <span className="text-[10px] text-indigo-400/80 font-sans hidden sm:inline">
                  ({v.label})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-4">
          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Subject Line Template
            </label>
            <input
              type="text"
              value={subjectTemplate}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="e.g. Application for {{catName}} Role - Full Stack Engineer"
              className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Body Template / AI Instructions
            </label>
            <textarea
              rows={9}
              value={bodyTemplate}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="Type your personalized cold email template here..."
              className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-200 placeholder-slate-500 outline-none transition-colors resize-y"
            />
          </div>
        </div>
      ) : (
        /* Live Rendered Preview */
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Preview for Lead:</div>
            <div className="text-sm font-semibold text-cyan-400 mt-0.5">
              {sampleLead.name} ({sampleLead.email}) — <span className="text-slate-300">{sampleLead.company}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Subject:</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {renderedSubject}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Body:</div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {renderedBody}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
