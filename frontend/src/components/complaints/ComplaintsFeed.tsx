import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate } from '../../lib/utils'

export function ComplaintsFeed() {
  const { complaints, submitComplaint } = useGridStore()
  const [text, setText]       = useState('')
  const [village, setVillage] = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      await submitComplaint({ text, village: village || undefined, phone: phone || undefined })
      setText(''); setVillage(''); setPhone('')
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="card-header">
        <MessageSquare className="w-4 h-4 text-electric" />
        Consumer Complaints
        <span className="ml-auto text-xs text-gray-500 font-mono">{complaints.length}</span>
        <button
          onClick={() => setShowForm(v => !v)}
          className="ml-2 px-2 py-0.5 rounded text-[10px] bg-electric/10 text-electric border border-electric/20 hover:bg-electric/20 transition"
        >
          + New
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-navy-800 rounded-lg border border-white/5 animate-fade-in">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Describe the issue…"
            rows={2}
            className="w-full bg-navy-600 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
            required minLength={5}
          />
          <div className="flex gap-2">
            <input
              value={village}
              onChange={e => setVillage(e.target.value)}
              placeholder="Village (optional)"
              className="flex-1 bg-navy-600 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500"
            />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-28 bg-navy-600 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-1.5 text-xs">
              <Send className="w-3 h-3" />
              {loading ? 'Submitting…' : 'Submit'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-xs">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {complaints.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">No complaints yet</p>
        ) : (
          complaints.map(c => (
            <div key={c.id} className="p-3 rounded-lg border border-white/5 bg-navy-800/50 animate-slide-in">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-gray-500">#{c.id}</span>
                <span className="font-semibold text-white">{c.village}</span>
                <span className="ml-auto text-[10px] font-mono text-electric">SEC {c.section_id}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{formatDate(c.submitted_at)}</p>
              {c.acknowledged && (
                <span className="text-[10px] text-fault-normal">✓ Acknowledged</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
