'use client';

import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Mail,
  CopyX,
  Sparkles,
  Trash2,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { parseExcelBuffer, generateSampleTechLeads, ParseResult } from '@/lib/excel-parser';
import { Lead } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ExcelUploaderProps {
  onLeadsLoaded: (leads: Lead[], stats: ParseResult['stats']) => void;
  leadsCount: number;
}

export default function ExcelUploader({ onLeadsLoaded, leadsCount }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<ParseResult['stats'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setFileName(file.name);

      const buffer = await file.arrayBuffer();
      const parsed = parseExcelBuffer(buffer);

      if (parsed.leads.length === 0) {
        throw new Error('No contact records found in this file.');
      }

      setStats(parsed.stats);
      onLeadsLoaded(parsed.leads, parsed.stats);
      toast.success(`Successfully parsed ${parsed.stats.validEmails} valid leads from ${file.name}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse Excel/CSV file.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const loadSampleDataset = async () => {
    try {
      setIsLoading(true);
      setFileName('data.xlsx (Vadodara & Tech Sample)');

      const res = await fetch('/api/campaign/load-sample');
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Could not load workspace sample file.');
      }

      setStats(data.stats);
      onLeadsLoaded(data.leads, data.stats);
      toast.success(`Loaded sample dataset with ${data.stats.validEmails} verified tech leads!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading sample dataset';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSyntheticDemo = () => {
    try {
      setIsLoading(true);
      setFileName('synthetic_25_leads.xlsx');
      const sample = generateSampleTechLeads(25);
      setStats(sample.stats);
      onLeadsLoaded(sample.leads, sample.stats);
      toast.success('Generated 25 instant synthetic demo leads!');
    } finally {
      setIsLoading(false);
    }
  };

  const resetUploader = () => {
    setFileName(null);
    setStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onLeadsLoaded([], { totalRows: 0, validEmails: 0, invalidEmails: 0, duplicateEmails: 0, categoriesCount: 0 });
    toast.info('Leads cleared.');
  };

  return (
    <Card glass className="border-slate-800/80 shadow-2xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Lead Ingestion & Contact Parser</span>
          </CardTitle>
          <CardDescription>
            Upload any Excel (.xlsx, .xls) or CSV spreadsheet. Auto-detects company names, HR contacts, emails, and notes.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSampleDataset}
            loading={isLoading}
            loadingText="Loading..."
            className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Load Sample Dataset
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={generateSyntheticDemo}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-200"
          >
            Quick 25 Demo
          </Button>

          {fileName && (
            <Button
              variant="destructive"
              size="sm"
              onClick={resetUploader}
              className="text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Dropzone or Processing Skeleton */}
        {isLoading ? (
          <div className="p-10 rounded-2xl border border-indigo-500/30 bg-indigo-950/15 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-white">Parsing Contacts & Validating Emails...</h4>
              <p className="text-xs text-slate-400">Extracting valid domains and organizing campaign batches</p>
            </div>
            <div className="max-w-md mx-auto space-y-2 pt-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4 mx-auto" />
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-300 cursor-pointer ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                : fileName
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-indigo-950/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  fileName
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-indigo-500/10 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20'
                }`}
              >
                {fileName ? <CheckCircle2 className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {fileName ? (
                    <span className="text-emerald-300 flex items-center gap-1.5 justify-center">
                      <Check className="w-4 h-4" /> {fileName}
                    </span>
                  ) : (
                    'Click to upload or drag & drop your Excel/CSV file'
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .xlsx, .xls, and .csv format with company names, emails, and recruiter data
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="text-[11px]">.XLSX</Badge>
                <Badge variant="secondary" className="text-[11px]">.CSV</Badge>
                <Badge variant="info" className="text-[11px]">Auto Header Mapping</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid on Loaded */}
        {stats && stats.totalRows > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Total Rows</span>
              </div>
              <div className="text-2xl font-extrabold text-white">
                {stats.totalRows.toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Valid Emails</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-300">
                {stats.validEmails.toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                <CopyX className="w-4 h-4 text-amber-400" />
                <span>Duplicates</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-300">
                {stats.duplicateEmails.toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-950/20 border border-rose-500/30 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Invalid Rows</span>
              </div>
              <div className="text-2xl font-extrabold text-rose-300">
                {stats.invalidEmails.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
