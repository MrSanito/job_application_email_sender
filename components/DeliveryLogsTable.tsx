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
  Calendar,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { QueueJob } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

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
  isLoading?: boolean;
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
  isLoading = false,
}: DeliveryLogsTableProps) {
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card glass className="shadow-2xl overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle>
            <Activity className={`w-5 h-5 ${isLoading ? 'text-cyan-400 animate-spin' : 'text-indigo-400'}`} />
            <span>Email Delivery Stream & Execution Logs</span>
            {isLoading ? (
              <Badge variant="purple" dot className="font-mono text-xs animate-pulse">
                Fetching logs...
              </Badge>
            ) : (
              <Badge variant="success" dot className="font-mono text-xs">
                <Database className="w-3 h-3 mr-1" />
                MongoDB Atlas
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Live trace of dispatch timestamps, QStash execution status, and personalized AI templates.
          </CardDescription>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All Jobs' },
            { id: 'queued', label: 'Queued' },
            { id: 'sent', label: 'Sent' },
            { id: 'simulated', label: 'Simulated' },
            { id: 'failed', label: 'Failed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((st) => (
            <Button
              key={st.id}
              variant={statusFilter === st.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onStatusFilterChange(st.id)}
              className="text-xs h-7 px-3 capitalize"
            >
              {st.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter logs by recipient email, contact name, company, or subject line..."
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Job ID</TableHead>
              <TableHead>Recipient & Company</TableHead>
              <TableHead>Subject Line</TableHead>
              <TableHead>Day / Batch</TableHead>
              <TableHead>Scheduled Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skeleton-row-${idx}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-14 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-36 rounded" />
                      <Skeleton className="h-3 w-28 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-52 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-500 italic">
                  No queue jobs found matching the active filter.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id} className="group">
                  <TableCell className="font-mono text-xs text-slate-400">
                    {job.id.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {job.lead.name || job.lead.company}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {job.lead.email}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-slate-200">
                    {job.subject}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="text-indigo-300 font-bold">Day {job.dayNumber}</span>
                    <span className="text-slate-500 mx-1.5">•</span>
                    <span className="text-amber-300 font-bold">Batch #{job.batchNumber}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono text-slate-300">
                        <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="font-bold text-white">
                          {job.scheduledTime
                            ? new Date(job.scheduledTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                        <span className="text-slate-500">@</span>
                        <span className="text-cyan-300 font-semibold">
                          {job.scheduledTime
                            ? new Date(job.scheduledTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </span>
                      </div>

                      {job.sentAt ? (
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                          <span>Sent at {new Date(job.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span>Queued for schedule</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.status === 'sent' && (
                      <Badge variant="success" dot>Sent</Badge>
                    )}
                    {job.status === 'simulated' && (
                      <Badge variant="info" dot>Simulated</Badge>
                    )}
                    {job.status === 'queued' && (
                      <Badge variant="warning" dot>Queued</Badge>
                    )}
                    {job.status === 'processing' && (
                      <Badge variant="purple" dot>In Flight</Badge>
                    )}
                    {job.status === 'failed' && (
                      <Badge variant="destructive" dot>Failed</Badge>
                    )}
                    {job.status === 'cancelled' && (
                      <Badge variant="destructive">Cancelled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJob(job)}
                      className="text-xs gap-1"
                    >
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>Inspect</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <div>
            Showing <strong className="text-white">{Math.min(1, totalCount)}</strong> to{' '}
            <strong className="text-white">{Math.min(limit * page, totalCount)}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> jobs
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono text-slate-300 px-2 font-semibold">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || isLoading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Inspect Dialog Modal */}
      <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        {selectedJob && (
          <DialogContent size="lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="success" dot className="font-mono text-[10px]">
                  MongoDB Record
                </Badge>
                <span className="text-xs text-slate-400 font-mono">Job ID: {selectedJob.id}</span>
              </div>
              <DialogTitle>
                {selectedJob.lead.name || selectedJob.lead.company} — <span className="text-slate-400 text-sm font-normal">{selectedJob.lead.company}</span>
              </DialogTitle>
              <DialogDescription>
                Recipient: <strong className="text-cyan-400 font-mono">{selectedJob.lead.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Status</span>
                  <span className="font-bold text-white capitalize mt-0.5 block">
                    {selectedJob.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Batch & Day</span>
                  <span className="font-bold text-cyan-300 mt-0.5 block">
                    Day {selectedJob.dayNumber} • Batch #{selectedJob.batchNumber}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Scheduled Time</span>
                  <span className="font-bold text-indigo-300 mt-0.5 block">
                    {selectedJob.scheduledTime
                      ? new Date(selectedJob.scheduledTime).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Dispatched Timestamp</span>
                  <span className="font-bold text-emerald-400 mt-0.5 block">
                    {selectedJob.sentAt
                      ? new Date(selectedJob.sentAt).toLocaleString()
                      : 'Pending Dispatch'}
                  </span>
                </div>

                {selectedJob.durationMs && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">Execution Latency</span>
                    <span className="font-bold text-amber-300 mt-0.5 block">
                      {selectedJob.durationMs} ms
                    </span>
                  </div>
                )}

                {selectedJob.modelUsed && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block">AI Engine</span>
                    <span className="font-bold text-cyan-300 mt-0.5 block truncate">
                      {selectedJob.modelUsed}
                    </span>
                  </div>
                )}
              </div>

              {/* QStash Message ID with copy button */}
              {selectedJob.qStashMessageId && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-xs block">Upstash QStash Message ID</span>
                    <span className="font-mono text-xs text-indigo-300 block truncate">
                      {selectedJob.qStashMessageId}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedJob.qStashMessageId!, 'QStash Message ID')}
                    className="text-xs h-8"
                  >
                    {copiedId === selectedJob.qStashMessageId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}

              {/* Subject */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dispatched Subject Line
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-sm font-bold text-white">
                  {selectedJob.subject}
                </div>
              </div>

              {/* Body */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dispatched Email Body
                </div>
                <div
                  className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-56 overflow-y-auto whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: selectedJob.bodyHtml }}
                />
              </div>

              {/* Error if any */}
              {selectedJob.error && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                  <strong className="block font-bold mb-0.5">Delivery Error Log:</strong>
                  {selectedJob.error}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
