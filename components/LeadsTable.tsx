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
  EyeOff,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Lead } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LeadsTableProps {
  leads: Lead[];
  onSelectLeadForPreview?: (lead: Lead) => void;
}

export default function LeadsTable({ leads, onSelectLeadForPreview }: LeadsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
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

  const handlePreview = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    if (onSelectLeadForPreview) {
      onSelectLeadForPreview(lead);
    }
  };

  return (
    <Card glass className="shadow-2xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle>
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Lead Preview & Validation Table</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {filteredLeads.length} leads
            </Badge>
          </CardTitle>
          <CardDescription>
            Search, filter, and inspect verified contacts before launching the campaign.
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs"
        >
          {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isOpen ? 'Collapse Table' : 'Expand Table'}</span>
        </Button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by company, HR contact, category, or email..."
                className="pl-10"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter('all'); setPage(1); }}
                className="text-xs"
              >
                All ({leads.length})
              </Button>
              <Button
                variant={statusFilter === 'valid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter('valid'); setPage(1); }}
                className={`text-xs ${statusFilter === 'valid' ? 'bg-emerald-600 hover:bg-emerald-500' : 'text-emerald-300'}`}
              >
                Valid ({leads.filter((l) => l.status === 'valid').length})
              </Button>
              <Button
                variant={statusFilter === 'duplicate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter('duplicate'); setPage(1); }}
                className={`text-xs ${statusFilter === 'duplicate' ? 'bg-amber-600 hover:bg-amber-500' : 'text-amber-300'}`}
              >
                Duplicates ({leads.filter((l) => l.status === 'duplicate').length})
              </Button>
              <Button
                variant={statusFilter === 'invalid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter('invalid'); setPage(1); }}
                className={`text-xs ${statusFilter === 'invalid' ? 'bg-rose-600 hover:bg-rose-500' : 'text-rose-300'}`}
              >
                Invalid ({leads.filter((l) => l.status === 'invalid').length})
              </Button>
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Company & Location</TableHead>
                <TableHead>Contact / HR</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                    No leads matching criteria found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isSelected = selectedLeadId === lead.id;

                  return (
                    <TableRow
                      key={lead.id}
                      className={isSelected ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : ''}
                    >
                      <TableCell className="font-mono text-xs text-slate-400">
                        {globalIdx}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{lead.company || 'Unknown Company'}</span>
                        </div>
                        {lead.catName && (
                          <div className="text-xs text-slate-400">{lead.catName}</div>
                        )}
                        {lead.address && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{lead.address}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-200">{lead.name || 'HR Recruiter'}</div>
                        {lead.phone && <div className="text-xs text-slate-400">{lead.phone}</div>}
                      </TableCell>
                      <TableCell>
                        {lead.email ? (
                          <span className="font-mono text-xs text-indigo-300 bg-indigo-950/40 px-2 py-1 rounded-md border border-indigo-800/40">
                            {lead.email}
                          </span>
                        ) : (
                          <span className="text-xs text-rose-400 italic">No Email Found</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.status === 'valid' && (
                          <Badge variant="success" dot>Valid Lead</Badge>
                        )}
                        {lead.status === 'duplicate' && (
                          <Badge variant="warning" dot>Duplicate</Badge>
                        )}
                        {lead.status === 'invalid' && (
                          <Badge variant="destructive" dot>Invalid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePreview(lead)}
                          className="text-xs"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{isSelected ? 'Selected' : 'Live Preview'}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                Showing <strong className="text-white">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-white">
                  {Math.min(currentPage * pageSize, filteredLeads.length)}
                </strong>{' '}
                of <strong className="text-white">{filteredLeads.length}</strong> leads
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-3 text-xs font-semibold text-slate-300">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
