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
  Sparkles
} from 'lucide-react';
import { parseExcelBuffer, generateSampleTechLeads, ParseResult } from '@/lib/excel-parser';
import { Lead } from '@/types';

interface ExcelUploaderProps {
  onLeadsLoaded: (leads: Lead[], stats: ParseResult['stats']) => void;
  leadsCount: number;
}

export default function ExcelUploader({ onLeadsLoaded, leadsCount }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ParseResult['stats'] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      const buffer = await file.arrayBuffer();
      const parsed = parseExcelBuffer(buffer);

      if (parsed.leads.length === 0) {
        throw new Error('No data or rows found in the uploaded file.');
      }

      setStats(parsed.stats);
      onLeadsLoaded(parsed.leads, parsed.stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel/CSV file.');
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
      setError(null);
      setFileName('data.xlsx (Workspace Sample)');

      const res = await fetch('/api/campaign/load-sample');
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Could not load workspace sample file.');
      }

      setStats(data.stats);
      onLeadsLoaded(data.leads, data.stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading sample dataset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTechLeads = () => {
    setIsLoading(true);
    setError(null);
    setFileName('Verified Tech Leads (75 Leads)');
    const parsed = generateSampleTechLeads(75);
    setStats(parsed.stats);
    onLeadsLoaded(parsed.leads, parsed.stats);
    setIsLoading(false);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            Upload Lead Spreadsheet
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Accepts Excel (.xlsx, .xls) and CSV files. Columns like Name, Email, Category, Company are auto-detected.
          </p>
        </div>

        {/* 1-Click Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateTechLeads}
            disabled={isLoading}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-500/20 hover:from-emerald-600/40 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/30 transition-all duration-200 shadow-md hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Load 75 Verified Tech Leads
          </button>

          <button
            onClick={loadSampleDataset}
            disabled={isLoading}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600/30 to-cyan-500/20 hover:from-indigo-600/40 hover:to-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all duration-200 shadow-md hover:scale-[1.02]"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span className="text-sm">⚡</span>
            )}
            Load data.xlsx (318 KB)
          </button>
        </div>
      </div>

      {/* Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
            : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="w-7 h-7 text-indigo-400" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-slate-200">
              {fileName ? (
                <span className="text-cyan-400 font-semibold">{fileName}</span>
              ) : (
                <>
                  <span className="text-indigo-400 underline decoration-indigo-500/50 underline-offset-4">
                    Click to browse
                  </span>{' '}
                  or drag and drop your Excel / CSV file here
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports .xlsx, .xls, .csv files up to 50MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Rows</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">
              {stats.totalRows.toLocaleString()}
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
              <span>Valid Emails</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-300 tracking-tight">
              {stats.validEmails.toLocaleString()}
            </div>
          </div>

          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
              <span>Duplicates Filtered</span>
              <CopyX className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300 tracking-tight">
              {stats.duplicateEmails.toLocaleString()}
            </div>
          </div>

          <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-3">
            <div className="flex items-center justify-between text-rose-400 text-xs mb-1">
              <span>Invalid / Missing</span>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-300 tracking-tight">
              {stats.invalidEmails.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
