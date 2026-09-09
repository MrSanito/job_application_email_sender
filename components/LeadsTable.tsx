'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  Building, 
  Briefcase, 
  Check, 
  AlertTriangle, 
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Lead } from '@/types';

interface LeadsTableProps {
  leads: Lead[];
  onSelectLeadForPreview?: (lead: Lead) => void;
}

export default function LeadsTable({ leads, onSelectLeadForPreview }: LeadsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const pageSize = 8;

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesFilter =
        statusFilter === 'all' ? true : lead.status === statusFilter;

      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        (lead.company && lead.company.toLowerCase().includes(q)) ||
        (lead.catName && lead.catName.toLowerCase().includes(q)) ||
        (lead.address && lead.address.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (leads.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              Lead Preview & Data Table
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredLeads.length} leads
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Preview, search and inspect leads extracted from your Excel workbook.
          </p>
        </div>

        {/* Toggle Collapse */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors self-start md:self-auto"
        >
          {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {isOpen ? 'Collapse Table' : 'Show Table'}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by company, name, category, or email..."
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 p-1 rounded-xl gap-1">
              {(['all', 'valid', 'duplicate', 'invalid'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Company / Lead</th>
                  <th className="py-3 px-4">Category / Industry</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {paginatedLeads.map((lead, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-900/50 transition-colors duration-150 group"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">{globalIdx}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                          {lead.name}
                        </div>
                        {lead.company && lead.company !== lead.name && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3" />
                            {lead.company}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-indigo-950/40 text-indigo-300 border border-indigo-800/30">
                          {lead.catName || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {lead.email ? (
                          <span className="text-cyan-300">{lead.email}</span>
                        ) : (
                          <span className="text-slate-600 italic">No email detected</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {lead.address || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {lead.status === 'valid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                        {lead.status === 'duplicate' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/50 text-amber-400 border border-amber-800/40">
                            <AlertTriangle className="w-3 h-3" /> Duplicate
                          </span>
                        )}
                        {lead.status === 'invalid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/50 text-rose-400 border border-rose-800/40">
                            <XCircle className="w-3 h-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onSelectLeadForPreview && (
                          <button
                            type="button"
                            onClick={() => onSelectLeadForPreview(lead)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                          >
                            Preview Email
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length} leads
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
