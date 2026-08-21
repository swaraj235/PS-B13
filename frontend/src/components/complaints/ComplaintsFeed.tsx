import { useState } from 'react'
import { MessageSquare, Send, Plus, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate } from '../../lib/utils'
import { api } from '../../lib/api'

// Village → section descriptions for the form helper
const KNOWN_AREAS: Record<string, number> = {
  'Kondhwa Budruk': 3, 'Kondhwa Khurd': 3, 'Undri': 3, 'Pisoli': 3,
  'Vadgaon': 3, 'Bavdhan': 3, 'Pirangut': 3,
  'Kothrud': 1, 'Warje': 1, 'Karve Nagar': 1,
  'Paud': 2, 'Bhugaon': 2,
  'Mulshi': 4, 'Lavad': 4,
  'Tamhini': 5, 'Donaje': 5,
}

export function ComplaintsFeed() {
  const { complaints, submitComplaint } = useGridStore()
  const [text,    setText]    = useState('')
  const [village, setVillage] = useState('')
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)

  // Local state to track acknowledged complaints (supplement the backend store)
  const [localAck, setLocalAck] = useState<Record<number, boolean>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      await submitComplaint({ text, village: village || undefined, phone: phone || undefined })
      setText('')
      setVillage('')
      setPhone('')
      setShowForm(false)
    } catch (err) {
      console.error('Failed to submit complaint:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcknowledge(id: number) {
    setAcknowledging(id)
    try {
      await api.acknowledgeComplaint(id)
      setLocalAck(prev => ({ ...prev, [id]: true }))
    } catch {
      // If acknowledge API doesn't exist yet, just update locally
      setLocalAck(prev => ({ ...prev, [id]: true }))
    } finally {
      setAcknowledging(null)
    }
  }

  const displayComplaints = complaints

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="card-header mb-0 justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-electric" />
          Consumer Complaints
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">
            {displayComplaints.length} total
          </span>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-electric/15 text-electric border border-electric/30 hover:bg-electric/25 transition text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Issue
          </button>
        </div>
      </div>

      {/* New complaint form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-[#0a1525] rounded-xl border border-electric/25 animate-fade-in">
          <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Report a Power Issue</p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Describe the problem (e.g. No power since 2 PM, streetlight sparking, transformer humming…)"
            rows={3}
            required
            minLength={5}
            className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-electric transition"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Area / Village</label>
              <input
                list="area-suggestions"
                value={village}
                onChange={e => setVillage(e.target.value)}
                placeholder="e.g. Kondhwa Budruk"
                className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-electric transition"
              />
              <datalist id="area-suggestions">
                {Object.keys(KNOWN_AREAS).map(area => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Phone (optional)</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Your number"
                type="tel"
                className="w-full bg-[#080d1a] border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-electric transition"
              />
            </div>
          </div>

          {village && KNOWN_AREAS[village] && (
            <p className="text-[11px] text-electric/80 bg-electric/10 rounded-lg px-3 py-1.5 border border-electric/20">
              📍 Mapped to <strong>Section {KNOWN_AREAS[village]}</strong> feeder
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-xs py-2">
              Cancel
            </button>
            <button type="submit" disabled={loading || !text.trim()} className="btn-primary flex items-center gap-2 text-sm py-2">
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}

      {/* Complaints list */}
      <div className="space-y-2.5 overflow-y-auto" style={{ maxHeight: 280 }}>
        {displayComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2 text-center">
            <MessageSquare className="w-7 h-7 text-gray-500" />
            <p className="text-sm font-medium">No complaints logged</p>
            <p className="text-xs text-gray-500">
              Click <strong className="text-electric">"Report Issue"</strong> above to submit a field complaint
            </p>
          </div>
        ) : (
          displayComplaints.map(c => {
            const isAcked = c.acknowledged || localAck[c.id]
            return (
              <div
                key={c.id}
                className={`p-3 rounded-xl border transition-all ${
                  isAcked
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-amber-500/25 bg-amber-500/5'
                }`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-bold text-electric flex-shrink-0">#{c.id}</span>
                    <span className="text-sm font-semibold text-white truncate">{c.village || 'Unknown Area'}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-navy-700 text-electric border border-electric/25 flex-shrink-0">
                    SEC {c.section_id}
                  </span>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(c.submitted_at)}
                  </span>
                  {isAcked ? (
                    <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(c.id)}
                      disabled={acknowledging === c.id}
                      className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 hover:text-amber-300 transition"
                    >
                      {acknowledging === c.id ? (
                        <>Processing…</>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Pending — Mark Done
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
