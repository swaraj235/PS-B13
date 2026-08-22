import React, { useState, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { 
  ClipboardList, Search, Filter, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Upload, Download, FileText, ThumbsUp, ShieldCheck, User, Image as ImageIcon, X
} from 'lucide-react'
import { api } from '../lib/api'
import type { ComplaintResponse } from '../types'
import { generatePdfReport } from '../lib/exportPdf'
import { formatDate } from '../lib/utils'

export function ComplaintsTriageView() {
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading]       = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [importingCsv, setImportingCsv] = useState(false)
  const [csvMessage, setCsvMessage]   = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const res = await api.getComplaints()
      setComplaints(res.complaints || [])
    } catch (err) {
      console.error('Failed to fetch complaints:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
    const interval = setInterval(fetchComplaints, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await api.updateComplaintStatus(id, newStatus)
      fetchComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed'
      alert(`Error updating complaint #${id}: ${msg}`)
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingCsv(true)
    setCsvMessage(null)

    try {
      const res = await api.importComplaintsCsv(file)
      setCsvMessage(`Successfully imported ${res.imported_count} complaints from CSV!`)
      fetchComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CSV Import failed'
      alert(`CSV Import Error: ${msg}`)
    } finally {
      setImportingCsv(false)
      e.target.value = ''
    }
  }

  const handleExportPdf = () => {
    if (complaints.length === 0) return
    generatePdfReport({
      title: 'Consumer Outage Complaints Verification & Triage Audit Report',
      subtitle: 'Official MSEDCL Field Operator Triage Record',
      summaryStats: [
        { label: 'Total Raised Complaints', value: complaints.length },
        { label: 'Pending Triage', value: complaints.filter(c => c.status === 'pending').length },
        { label: 'Verified & Dispatched', value: complaints.filter(c => c.status === 'in_progress').length },
        { label: 'Power Restored', value: complaints.filter(c => c.status === 'resolved').length },
      ],
      headers: ['Ticket ID', 'Substation Zone', 'Category', 'Submitted By', 'Status', 'Impact Count', 'Timestamp'],
      rows: complaints.map(c => [
        `#${c.id}`,
        `Section ${c.section_id} (${c.village})`,
        c.category || 'Power Outage',
        c.submitted_by || 'Anonymous',
        c.status.toUpperCase(),
        c.impact_count || 1,
        formatDate(c.submitted_at),
      ])
    })
  }

  const handleExportCsv = () => {
    if (complaints.length === 0) return
    const headers = 'Ticket_ID,Section_ID,Village,Category,Description,Submitted_By,Status,Impact_Count,Submitted_At\n'
    const rows = complaints.map(c => 
      `${c.id},${c.section_id},"${c.village}","${c.category || ''}","${(c.description || '').replace(/"/g, '""')}","${c.submitted_by || ''}",${c.status},${c.impact_count || 1},${c.submitted_at}`
    ).join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `msedcl_complaints_triage_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      (c.village && c.village.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.category && c.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.submitted_by && c.submitted_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.id && c.id.toString().includes(searchTerm))

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080d1a] space-y-6">
      <Header title="Consumer Outage Complaint Triage & Verification Studio" />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Header Card */}
        <div className="bg-[#0d1626] border border-electric/20 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                Consumer Outage Complaints Verification Hub
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-500/30">
                  {complaints.length} Total Complaints
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Triage incoming public outage submissions, verify line authenticity, dismiss spam, and dispatch repair crews.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{importingCsv ? 'Ingesting CSV...' : 'Import Bulk CSV'}</span>
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
            </label>

            <button
              onClick={handleExportPdf}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF Report</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-electric hover:bg-electric/90 text-[#070d18] rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-electric/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {csvMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{csvMessage}</span>
            </div>
            <button onClick={() => setCsvMessage(null)} className="text-gray-400 hover:text-white text-xs">Dismiss</button>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-electric" /> Status:
            </span>
            {['ALL', 'pending', 'in_progress', 'resolved', 'spam'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-electric text-[#070d18] shadow'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by ticket #, user, area..."
              className="w-full bg-[#050b14] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric"
            />
          </div>
        </div>

        {/* Complaints Table & Verification Actions */}
        <div className="bg-[#0d1626] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-electric" />
              Triage Records Queue ({filteredComplaints.length} Items)
            </h3>
            <button onClick={fetchComplaints} className="text-gray-400 hover:text-white text-xs flex items-center gap-1">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-electric' : ''}`} /> Refresh Queue
            </button>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <ClipboardList className="w-8 h-8 text-gray-500 mx-auto opacity-50" />
              <p className="text-sm font-semibold">No complaints found for selected filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050b14] border-b border-white/10 text-gray-400 uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Substation Section</th>
                    <th className="py-3 px-4">Category & Details</th>
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4">Impact / Endorsements</th>
                    <th className="py-3 px-4">Evidence</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4 text-right">Triage Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredComplaints.map(c => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-electric">#{c.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-gray-300 font-bold block">SEC {c.section_id}</span>
                        <span className="text-[11px] text-gray-400">{c.village}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <strong className="text-white block">{c.category || 'Power Outage'}</strong>
                        {c.description && <p className="text-[11px] text-gray-400 truncate">{c.description}</p>}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span>{c.submitted_by || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30 inline-flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> {c.impact_count || 1} Affected
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {c.image_data ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(c.image_data || null)}
                            className="text-electric hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Photo
                          </button>
                        ) : (
                          <span className="text-gray-500 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          c.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          c.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          c.status === 'spam' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status !== 'in_progress' && c.status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, 'in_progress')}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title="Verify & Dispatch Repair Crew"
                            >
                              Verify & Dispatch
                            </button>
                          )}
                          {c.status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, 'resolved')}
                              className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title="Mark Power Restored"
                            >
                              Resolve
                            </button>
                          )}
                          {c.status !== 'spam' && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, 'spam')}
                              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              title="Mark as Spam / Invalid"
                            >
                              Mark Spam
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="relative bg-[#0b1322] border border-electric/40 rounded-2xl p-4 max-w-lg w-full shadow-2xl">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1.5 rounded-xl bg-black/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-electric" />
              Attached Complaint Evidence Photo
            </h4>
            <img src={selectedPhoto} alt="Evidence" className="w-full max-h-96 object-contain rounded-xl border border-white/10" />
          </div>
        </div>
      )}
    </div>
  )
}
