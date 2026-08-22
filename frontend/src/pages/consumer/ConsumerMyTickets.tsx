import { useState, useEffect } from 'react'
import { 
  Clock, CheckCircle2, RefreshCw, Image as ImageIcon, X, ThumbsUp, PlusCircle, ShieldCheck, FileText, PhoneCall
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import type { ComplaintResponse } from '../../types'
import { useNavigate } from 'react-router-dom'

export function ConsumerMyTickets() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [userComplaints, setUserComplaints] = useState<ComplaintResponse[]>([])
  const [fetching, setFetching]             = useState(false)
  const [filter, setFilter]                 = useState<'all' | 'active' | 'resolved'>('all')
  const [selectedPhoto, setSelectedPhoto]   = useState<string | null>(null)
  const [endorsingId, setEndorsingId]       = useState<number | null>(null)

  const loadMyComplaints = async () => {
    if (!user?.email) return
    setFetching(true)
    try {
      const res = await api.getComplaints(user.email)
      setUserComplaints(res.complaints || [])
    } catch {
      // Fallback
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    loadMyComplaints()
    const interval = setInterval(loadMyComplaints, 5000)
    return () => clearInterval(interval)
  }, [user?.email])

  const handleEndorse = async (id: number) => {
    setEndorsingId(id)
    try {
      await api.endorseComplaint(id)
      loadMyComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Endorsement failed'
      alert(`Error: ${msg}`)
    } finally {
      setEndorsingId(null)
    }
  }

  const filteredTickets = userComplaints.filter(c => {
    if (filter === 'active') return c.status === 'pending' || c.status === 'in_progress'
    if (filter === 'resolved') return c.status === 'resolved'
    return true
  })

  const activeCount   = userComplaints.filter(c => c.status !== 'resolved').length
  const resolvedCount = userComplaints.filter(c => c.status === 'resolved').length

  return (
    <div className="w-full space-y-6">
      {/* Header & Stats Bar */}
      <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">My Outage Tickets & Resolution Hub</h2>
              <p className="text-xs text-gray-400">Track field crew dispatch & resolution progress in real time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/consumer/report')}
              className="px-4 py-2 bg-electric hover:bg-electric/90 text-[#050b14] font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report New Outage</span>
            </button>

            <button
              onClick={loadMyComplaints}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors cursor-pointer border border-white/10"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin text-electric' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills & Summary Indicators */}
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            {(['all', 'active', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-electric text-[#050b14]'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                {f} ({
                  f === 'all' ? userComplaints.length :
                  f === 'active' ? activeCount : resolvedCount
                })
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-gray-400 font-mono text-xs">
            <span>Active: <strong className="text-amber-400">{activeCount}</strong></span>
            <span>Restored: <strong className="text-emerald-400">{resolvedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Filtered Tickets List */}
        <div className="lg:col-span-7 space-y-4">
          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#0b1322]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-gray-200">No tickets found for filter: '{filter}'</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                When you report a power outage or line fault, track MSEDCL crew response and live restoration progress here.
              </p>
            </div>
          ) : (
            filteredTickets.map(c => {
              const isPending    = c.status === 'pending'
              const isInProgress = c.status === 'in_progress'
              const isResolved   = c.status === 'resolved'

              return (
                <div key={c.id} className="p-5 rounded-2xl bg-[#0b1322] border border-white/10 space-y-4 shadow-xl hover:border-electric/30 transition-all">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-electric">Ticket #{c.id}</span>
                      <span className="text-xs text-gray-400 font-mono bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
                        SEC {c.section_id} ({c.village})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.impact_count && c.impact_count > 1 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          👥 {c.impact_count} Residents Impacted
                        </span>
                      )}

                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isResolved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        isInProgress ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{c.category || 'Power Outage'}</h3>
                      {c.description && <p className="text-xs text-gray-300 mt-1">{c.description}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">Logged on: {new Date(c.submitted_at).toLocaleString()}</p>
                    </div>

                    {!isResolved && (
                      <button
                        onClick={() => handleEndorse(c.id)}
                        disabled={endorsingId === c.id}
                        className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{endorsingId === c.id ? 'Updating...' : 'Endorse (+1 Priority)'}</span>
                      </button>
                    )}
                  </div>

                  {c.image_data && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto(c.image_data || null)}
                        className="flex items-center gap-1.5 text-xs text-electric hover:underline font-bold cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>View Attached Evidence Photo</span>
                      </button>
                    </div>
                  )}

                  {/* 4-Step Resolution Progress Stepper */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <span className={isPending || isInProgress || isResolved ? 'text-electric font-black' : ''}>1. Received</span>
                      <span className={isInProgress || isResolved ? 'text-amber-400 font-black' : ''}>2. Crew Dispatched</span>
                      <span className={isInProgress || isResolved ? 'text-purple-400 font-black' : ''}>3. Line Repair</span>
                      <span className={isResolved ? 'text-emerald-400 font-black' : ''}>4. Power Restored</span>
                    </div>

                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className={`h-full transition-all duration-500 ${
                        isResolved ? 'w-full bg-emerald-400 shadow-lg shadow-emerald-400/30' :
                        isInProgress ? 'w-2/3 bg-amber-400 animate-pulse shadow-lg shadow-amber-400/30' :
                        'w-1/4 bg-electric shadow-lg shadow-electric/30'
                      }`} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column (5 Cols): SLA Targets & Audit Log Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* MSEDCL Restoration Target Card */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-electric" />
              MSEDCL Service Level Agreement (SLA)
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#050b14] rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">11kV Feeder Line Fault ETR</span>
                <span className="text-electric font-bold font-mono">&lt; 45 Mins</span>
              </div>
              <div className="p-3 bg-[#050b14] rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Transformer Failure Replacement</span>
                <span className="text-amber-400 font-bold font-mono">&lt; 4 Hours</span>
              </div>
              <div className="p-3 bg-[#050b14] rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Voltage Sag Investigation</span>
                <span className="text-emerald-400 font-bold font-mono">&lt; 2 Hours</span>
              </div>
            </div>
          </div>

          {/* Ticket Audit Log History */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <FileText className="w-4 h-4 text-electric" />
                <span>Ticket Audit Log Trail</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">REALTIME</span>
            </div>

            <div className="space-y-3 text-xs">
              {userComplaints.slice(0, 3).map(c => (
                <div key={c.id} className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-electric font-bold">TICKET #{c.id}</span>
                    <span className="text-gray-500">{new Date(c.submitted_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-snug">{c.category}: {c.village}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Lightbox Modal */}
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
              Fault Evidence Photo
            </h4>
            <img src={selectedPhoto} alt="Fault Photo" className="w-full max-h-96 object-contain rounded-xl border border-white/10" />
          </div>
        </div>
      )}
    </div>
  )
}
