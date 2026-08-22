import { useState, useEffect } from 'react'
import { ClipboardList, ArrowRight, ThumbsUp, AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import type { ComplaintResponse } from '../../types'
import { useNavigate } from 'react-router-dom'

export function ComplaintsSummaryCard() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [loading, setLoading]       = useState(false)

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const res = await api.getComplaints()
      setComplaints(res.complaints || [])
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 6000)
    return () => clearInterval(interval)
  }, [])

  const pendingCount    = complaints.filter(c => c.status === 'pending').length
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length
  const resolvedCount   = complaints.filter(c => c.status === 'resolved').length
  const activeOutage    = complaints.find(c => c.status === 'pending' || c.status === 'in_progress')

  return (
    <div className="card flex flex-col gap-4 bg-[#0d1626] border border-electric/20 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <ClipboardList className="w-4 h-4 text-electric" />
          <span>Consumer Complaints Overview</span>
        </div>

        <button
          onClick={fetchSummary}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          title="Refresh summary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-electric' : ''}`} />
        </button>
      </div>

      {/* 4 Summary Stats Grid */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold block uppercase">Total</span>
          <span className="text-sm font-black text-white font-mono">{complaints.length}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#050b14] border border-blue-500/20 space-y-0.5">
          <span className="text-[10px] text-blue-400 font-bold block uppercase">Pending</span>
          <span className="text-sm font-black text-blue-300 font-mono">{pendingCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#050b14] border border-amber-500/20 space-y-0.5">
          <span className="text-[10px] text-amber-400 font-bold block uppercase">Dispatched</span>
          <span className="text-sm font-black text-amber-300 font-mono">{inProgressCount}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#050b14] border border-emerald-500/20 space-y-0.5">
          <span className="text-[10px] text-emerald-400 font-bold block uppercase">Restored</span>
          <span className="text-sm font-black text-emerald-300 font-mono">{resolvedCount}</span>
        </div>
      </div>

      {/* Highlighted Active Ticket */}
      {activeOutage ? (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
            <div className="truncate">
              <span className="text-amber-300 font-bold font-mono">Ticket #{activeOutage.id}</span>
              <span className="text-gray-300 ml-2">({activeOutage.village})</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
            👥 {activeOutage.impact_count || 1} Impacted
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>All feeder lines reporting normal operation. No active unaddressed tickets.</span>
        </div>
      )}

      {/* Button to Open Triage Studio */}
      <button
        onClick={() => navigate('/complaints')}
        className="w-full py-2.5 bg-electric/15 hover:bg-electric/25 border border-electric/40 text-electric hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <span>Open Complaint Triage Studio</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}
