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
  Wand2,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Lead } from '@/types';
import { renderTemplate } from '@/lib/template-engine';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

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
  { tag: '{{catName}}', label: 'Role / Industry', icon: Briefcase },
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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [companyContext, setCompanyContext] = useState<string | null>(null);

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
    toast.info(`Inserted ${tag} into email body`);
  };

  // Generate on-the-spot personalized email using Mistral AI + Tavily Web Intelligence
  const handleGenerateOnTheSpotWithAi = async () => {
    try {
      setIsGeneratingAi(true);

      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: sampleLead,
          candidateProfile: {
            name: 'Vishal Nishad',
            role: 'Full-Stack Developer (MERN + Gen AI)',
            skills: 'Next.js, React, Node.js, TypeScript, AI Voice systems (Pipecat), STT/TTS, BullMQ, Redis, MongoDB',
            portfolioUrl: 'https://github.com/MrSanito',
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'AI generation failed');
      }

      onSubjectChange(data.subject);
      onBodyChange(data.textBody || data.htmlBody.replace(/<[^>]*>?/gm, ''));
      setCompanyContext(data.companyContext || null);
      setActiveTab('preview');
      toast.success(`Generated email via ${data.modelUsed || 'Mistral AI'} in ${data.latencyMs}ms!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate with AI';
      toast.error(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(`Subject: ${renderedSubject}\n\n${renderedBody}`);
    setCopiedPreview(true);
    toast.success('Copied full email to clipboard!');
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <Card glass className="shadow-2xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle>
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Dynamic Email Composer & AI Studio</span>
            <Badge variant="purple" dot>
              <Bot className="w-3 h-3 mr-1" />
              Mistral + Tavily
            </Badge>
          </CardTitle>
          <CardDescription>
            Craft standard recruitment templates with smart dynamic tags or click to research the company on Tavily and generate an authentic pitch with Mistral AI.
          </CardDescription>
        </div>

        {/* Actions & Tab Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click AI Generator Button */}
          <Button
            variant="glowing"
            size="sm"
            onClick={handleGenerateOnTheSpotWithAi}
            loading={isGeneratingAi}
            loadingText="Researching Company & Drafting..."
            className="text-xs"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-950" />
            <span>Mistral + Tavily Research</span>
          </Button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenTestEmailModal}
            className="text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
          >
            <Send className="w-3.5 h-3.5" />
            Send Test
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Dynamic Variable Chips */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            Click Variable to Insert:
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertTagToBody(v.tag)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/30 text-xs font-mono transition-all hover:scale-105 active:scale-95 group cursor-pointer"
                  title={`Insert ${v.label}`}
                >
                  <Icon className="w-3 h-3 text-indigo-400 group-hover:text-cyan-400 transition-colors" />
                  <span>{v.tag}</span>
                  <span className="text-[10px] text-indigo-400/80 font-sans hidden sm:inline">
                    ({v.label})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content: Editor vs Preview */}
        {isGeneratingAi ? (
          /* Shimmering AI Generation Skeleton */
          <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
              <div>
                <h4 className="font-bold text-sm text-white">Google Gemini Generating Personalized Pitch...</h4>
                <p className="text-xs text-slate-400">Synthesizing lead company info with candidate profile</p>
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : activeTab === 'editor' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Subject Line Template
              </label>
              <Input
                type="text"
                value={subjectTemplate}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="e.g. Full-Stack / AI Voice Developer — open to opportunities"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Body Template
              </label>
              <Textarea
                rows={9}
                value={bodyTemplate}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="Hi {{name}}, I noticed {{company}}..."
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        ) : (
          /* Live Rendered Preview */
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Previewing Recipient</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">
                  {sampleLead.name} ({sampleLead.email}) — <span className="text-slate-300">{sampleLead.company}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPreview}
                className="text-xs"
              >
                {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPreview ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            {companyContext && (
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tavily Web Intelligence & Company Context</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">
                  {companyContext}
                </p>
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</div>
              <div className="text-sm font-bold text-white mt-1 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800">
                {renderedSubject}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Body</div>
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                {renderedBody}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
