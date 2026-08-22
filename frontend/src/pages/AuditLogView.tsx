import { useState, useEffect } from 'react'
import { FileText, Search, RefreshCw, Download, Filter, ShieldCheck, CheckCircle2, Truck, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { api } from '../lib/api'
import type { AuditLog } from '../types'
import { formatDate } from '../lib/utils'
import { generatePdfReport } from '../lib/exportPdf'

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL')

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const res = await api.getAuditLogs()
      setLogs(res.audit_logs || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
    const interval = setInterval(fetchAuditLogs, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.performed_by && log.performed_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.complaint_id && log.complaint_id.toString().includes(searchTerm))

    const matchesAction = selectedActionFilter === 'ALL' || log.action === selectedActionFilter
    return matchesSearch && matchesAction
  })

  const handleExportAuditPdf = () => {
    if (logs.length === 0) return
    generatePdfReport({
      title: 'GridSentinel Immutable Audit Trail Report',
      subtitle: 'Official MSEDCL System Event & Action History',
      summaryStats: [
        { label: 'Total Events Recorded', value: logs.length },
        { label: 'Complaints Raised', value: logs.filter(l => l.action === 'COMPLAINT_RAISED').length },
        { label: 'Crews Dispatched', value: logs.filter(l => l.action === 'CREW_DISPATCHED').length },
        { label: 'Power Restorations', value: logs.filter(l => l.action === 'POWER_RESTORED').length },
      ],
      headers: ['Event ID', 'Timestamp', 'Action', 'Ticket Ref', 'Details', 'Operator'],
      rows: logs.map(l => [
        `#${l.id}`,
        formatDate(l.timestamp),
        l.action,
        l.complaint_id ? `#${l.complaint_id}` : '—',
        l.details,
        l.performed_by
      ])
    })
  }

  const handleExportAuditCSV = () => {
    if (logs.length === 0) return
    const headers = 'ID,Complaint_ID,Action,Details,Performed_By,Timestamp\n'
    const rows = logs.map(l => `${l.id},${l.complaint_id || ''},"${l.action}","${l.details.replace(/"/g, '""')}","${l.performed_by}",${l.timestamp}`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grid_sentinel_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'POWER_RESTORED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Power Restored
          </span>
        )
      case 'CREW_DISPATCHED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
            <Truck className="w-3 h-3" /> Crew Dispatched
          </span>
        )
      case 'COMPLAINT_RAISED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Complaint Raised
          </span>
        )
      case 'CSV_BULK_IMPORT':
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3" /> Bulk CSV Ingest
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/30 text-[10px] font-bold">
            {action}
          </span>
        )
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 w-full animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d1626] border border-electric/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-electric/10 border border-electric/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-electric" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              GridSentinel Immutable Audit Log
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                Operator Traceability
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Comprehensive chronological log of outage submissions, dispatch operations, and power restorations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchAuditLogs}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-electric' : ''}`} />
            Refresh Trail
          </button>

          <button
            onClick={handleExportAuditPdf}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>

          <button
            onClick={handleExportAuditCSV}
            className="px-4 py-2 rounded-xl bg-electric hover:bg-electric/90 text-[#070d18] text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-electric/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Controls: Search & Filter Tabs */}
      <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-electric" /> Event Type:
          </span>
          {['ALL', 'COMPLAINT_RAISED', 'CREW_DISPATCHED', 'POWER_RESTORED', 'CSV_BULK_IMPORT'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedActionFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedActionFilter === cat
                  ? 'bg-electric text-[#070d18] shadow'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by ticket #, area, operator..."
            className="w-full bg-[#050b14] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-electric"
          />
        </div>
      </div>

      {/* Audit Log Table View */}
      <div className="bg-[#0d1626] border border-electric/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-electric" />
            Audit Trail Events ({filteredLogs.length} Records)
          </h3>
          <span className="text-[11px] text-gray-400 font-mono">SQLite Persistent Store</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <FileText className="w-8 h-8 text-gray-500 mx-auto opacity-50" />
            <p className="text-sm font-semibold">No audit log records found</p>
            <p className="text-xs text-gray-500">Submit complaints or update ticket status to generate audit events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050b14] border-b border-white/10 text-gray-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Ticket Ref</th>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-400">#{log.id}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-[11px]">{formatDate(log.timestamp)}</td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-electric">
                      {log.complaint_id ? `#${log.complaint_id}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-200">{log.details}</td>
                    <td className="py-3 px-4 text-gray-300 font-semibold">{log.performed_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
