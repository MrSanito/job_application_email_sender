'use client';

import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Mail,
  Zap,
  Database,
  Calendar
} from 'lucide-react';
import { QueueJob } from '@/types';

interface DeliveryLogsTableProps {
  jobs: QueueJob[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  search: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (st: string) => void;
}

export default function DeliveryLogsTable({
  jobs,
  totalCount,
  page,
  limit,
  onPageChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: DeliveryLogsTableProps) {
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Email Delivery Logs & MongoDB Activity Trace
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
              <Database className="w-3 h-3 text-emerald-400" />
              Synced to MongoDB Atlas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Trace exact dispatch timestamps, personalized details, and Upstash QStash delivery metadata.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Jobs' },
              { id: 'queued', label: 'Queued' },
              { id: 'sent', label: 'Sent' },
              { id: 'simulated', label: 'Simulated' },
              { id: 'failed', label: 'Failed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onStatusFilterChange(st.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter logs by recipient email, name, company, or subject line..."
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
        />
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Job ID</th>
              <th className="py-3 px-4">Recipient & Company</th>
              <th className="py-3 px-4">Subject Line</th>
              <th className="py-3 px-4">Day / Batch</th>
              <th className="py-3 px-4">Scheduled Date & Time</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-300">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                  No queue jobs found matching the active filter.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-900/50 transition-colors duration-150 group"
                >
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {job.id.slice(-8)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-white group-hover:text-cyan-300 transition-colors">
                      {job.lead.name || job.lead.company}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {job.lead.email}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-200">
                    {job.subject}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    <span className="text-indigo-300">Day {job.dayNumber}</span>
                    <span className="text-slate-500 mx-1">•</span>
                    <span className="text-amber-300">Batch #{job.batchNumber}</span>
                  </td>
                  <td className="py-3 px-4 text-[11px]">
                    <div className="space-y-0.5">
                      {/* Scheduled Date & Time Badge */}
                      <div className="flex items-center gap-1 font-mono text-slate-300">
                        <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="font-semibold text-white">
                          {job.scheduledTime
                            ? new Date(job.scheduledTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                        <span className="text-slate-500">@</span>
                        <span className="text-cyan-300 font-bold">
                          {job.scheduledTime
                            ? new Date(job.scheduledTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </span>
                      </div>

                      {/* Dispatch execution status sub-line */}
                      {job.sentAt ? (
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span>
                            Sent: {new Date(job.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                            {new Date(job.sentAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : job.status === 'cancelled' ? (
                        <div className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                          <X className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                          <span>Cancelled</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-400/90 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span>Queued for schedule</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {job.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" /> Sent
                      </span>
                    )}
                    {job.status === 'simulated' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                        <Sparkles className="w-3 h-3" /> Simulated
                      </span>
                    )}
                    {job.status === 'queued' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/50">
                        <Clock className="w-3 h-3" /> Queued
                      </span>
                    )}
                    {job.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-700/50 animate-pulse">
                        <Activity className="w-3 h-3" /> In Flight
                      </span>
                    )}
                    {job.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/40">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                    {job.status === 'cancelled' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/40">
                        <X className="w-3 h-3" /> Cancelled
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 text-xs border border-slate-800 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <div>
          Showing {Math.min(1, totalCount)} to {Math.min(limit * page, totalCount)} of {totalCount} jobs
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-300">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* JOB INSPECTION MODAL DRAWER */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                  <span>Job Inspector • {selectedJob.id}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800/40">
                    MongoDB Record
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {selectedJob.lead.name || selectedJob.lead.company} ({selectedJob.lead.email}) — <span className="text-slate-400">{selectedJob.lead.company}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block">Status</span>
                <span className="font-semibold text-white capitalize mt-0.5 block">
                  {selectedJob.status}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block">Batch & Day</span>
                <span className="font-semibold text-cyan-300 mt-0.5 block">
                  Day {selectedJob.dayNumber} • Batch #{selectedJob.batchNumber}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block">Scheduled Date & Time</span>
                <span className="font-semibold text-indigo-300 mt-0.5 block">
                  {selectedJob.scheduledTime
                    ? `${new Date(selectedJob.scheduledTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} @ ${new Date(selectedJob.scheduledTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}`
                    : 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block">Exact Dispatched Timestamp</span>
                <span className="font-semibold text-emerald-400 mt-0.5 block">
                  {selectedJob.sentAt
                    ? `${new Date(selectedJob.sentAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })} @ ${new Date(selectedJob.sentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}`
                    : 'Not Sent Yet'}
                </span>
              </div>
              {selectedJob.durationMs && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block">Dispatch Latency</span>
                  <span className="font-semibold text-amber-300 mt-0.5 block">
                    {selectedJob.durationMs} ms
                  </span>
                </div>
              )}
              {selectedJob.modelUsed && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block">AI Model Used</span>
                  <span className="font-semibold text-cyan-300 mt-0.5 block truncate">
                    {selectedJob.modelUsed}
                  </span>
                </div>
              )}
              {selectedJob.qStashMessageId && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-3">
                  <span className="text-slate-500 block">Upstash QStash Message ID</span>
                  <span className="font-mono text-[11px] text-indigo-300 mt-0.5 block truncate">
                    {selectedJob.qStashMessageId}
                  </span>
                </div>
              )}
            </div>

            {/* Dispatched Subject */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Dispatched Subject Line
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-sm font-semibold text-white">
                {selectedJob.subject}
              </div>
            </div>

            {/* Dispatched Body */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Dispatched Email Body (Rendered HTML)
              </div>
              <div
                className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-60 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: selectedJob.bodyHtml }}
              />
            </div>

            {/* Error Display if any */}
            {selectedJob.error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                <strong className="block font-bold mb-0.5">Delivery Error:</strong>
                {selectedJob.error}
              </div>
            )}

            {/* Close Button */}
            <div className="text-right pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
