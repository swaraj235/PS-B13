import { useState } from 'react'
import { MessageSquare, Send, Plus, CheckCircle2, Clock, Upload, FileSpreadsheet, Download, X, Eye } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatDate } from '../../lib/utils'
import { api } from '../../lib/api'

// Village → section descriptions for the form helper
const KNOWN_AREAS: Record<string, number> = {
  'Kondhwa Budruk': 3, 'Kondhwa Khurd': 3, 'Undri': 3, 'Pisoli': 3, 'NIBM Rd': 3,
  'Kothrud Central': 1, 'Warje Malwadi': 1, 'Karve Nagar': 1, 'Erandwane': 1,
  'Paud Road': 2, 'Ideal Colony': 2, 'Bavdhan Khurd': 2, 'Bhugaon': 2,
  'Hadapsar': 4, 'Magarpatta': 4, 'Amanora': 4, 'Mundhwa': 4,
  'Swargate Terminal': 5, 'Camp Market': 5, 'Parvati Hill': 5, 'Shivajinagar': 5,
}

interface ParsedCSVRow {
  area_name: string
  category: string
  description: string
  section_id?: number
  consumer_name?: string
  email?: string
}

export function ComplaintsFeed() {
  const { complaints, submitComplaint, loadComplaints } = useGridStore()
  const [text,    setText]    = useState('')
  const [village, setVillage] = useState('')
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [acknowledging, setAcknowledging] = useState<number | null>(null)

  // CSV Import Modal state
  const [showCSVModal, setShowCSVModal] = useState(false)
  const [csvRows, setCsvRows]           = useState<ParsedCSVRow[]>([])
  const [importingCSV, setImportingCSV] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      await submitComplaint({ village: village || 'Unknown Area', category: 'Power Outage', description: text })
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

  async function handleUpdateStatus(id: number, status: string) {
    setAcknowledging(id)
    try {
      await api.updateComplaintStatus(id, status)
      loadComplaints()
    } catch (err) {
      console.error('Status update error:', err)
    } finally {
      setAcknowledging(null)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) return

      const lines = content.split(/\r\n|\n/).filter(line => line.trim().length > 0)
      if (lines.length <= 1) {
        alert('CSV file appears to be empty or missing data rows.')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows: ParsedCSVRow[] = []

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim())
        if (parts.length === 0 || !parts[0]) continue

        const area_name = parts[0] || 'Unknown Area'
        const category  = parts[1] || 'Outage / Power Cut'
        const description = parts[2] || 'Call center complaint dump'
        const section_id = parts[3] ? parseInt(parts[3], 10) : undefined
        const consumer_name = parts[4] || 'Consumer'
        const email = parts[5] || 'batch@pune.in'

        rows.push({ area_name, category, description, section_id, consumer_name, email })
      }

      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  const handleDownloadSampleCSV = () => {
    const sample = `area_name,category,description,section_id,consumer_name,email
Kothrud Central,Total Power Cut / Blackout,Transformer sparks observed near Karve Statue,1,Amit Deshmukh,amit@gmail.com
Bavdhan Khurd,Voltage Fluctuation / Dim Lights,Heavy dim light fluctuation since 3 PM,2,Suresh Joshi,suresh@gmail.com
Kondhwa Budruk,Line Sparking / Cable Snap,Tree branch fell on overhead distribution wire,3,Pooja Patil,pooja@gmail.com`

    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'grid_sentinel_complaints_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExecuteCSVImport = async () => {
    if (csvRows.length === 0) return
    setImportingCSV(true)
    try {
      await api.importCSV(csvRows)
      alert(`Successfully imported ${csvRows.length} complaints into triage system!`)
      setCsvRows([])
      setShowCSVModal(false)
      loadComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CSV import failed'
      alert(`Error importing CSV: ${msg}`)
    } finally {
      setImportingCSV(false)
    }
  }

  const displayComplaints = complaints

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="card-header mb-0 justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-electric" />
          Consumer Outage Complaints Triage
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono mr-1">
            {displayComplaints.length} total
          </span>

          <button
            onClick={() => setShowCSVModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import CSV
          </button>

          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-electric/15 text-electric border border-electric/30 hover:bg-electric/25 transition text-xs font-bold cursor-pointer"
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
              Click <strong className="text-electric">"Report Issue"</strong> or <strong className="text-purple-400">"Import CSV"</strong> above
            </p>
          </div>
        ) : (
          displayComplaints.map(c => {
            const isPending    = c.status === 'pending' || (!c.status && !c.acknowledged)
            const isInProgress = c.status === 'in_progress' || (c.acknowledged && c.status !== 'resolved')
            const isResolved   = c.status === 'resolved'

            return (
              <div
                key={c.id}
                className={`p-3 rounded-xl border transition-all ${
                  isResolved ? 'border-emerald-500/20 bg-emerald-500/5' :
                  isInProgress ? 'border-amber-500/25 bg-amber-500/5' :
                  'border-blue-500/25 bg-blue-500/5'
                }`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-bold text-electric flex-shrink-0">#{c.id}</span>
                    <span className="text-sm font-semibold text-white truncate">{c.village || 'Unknown Area'}</span>
                    {c.consumer_name && (
                      <span className="text-[10px] text-gray-400">({c.consumer_name})</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-navy-700 text-electric border border-electric/25 flex-shrink-0">
                    SEC {c.section_id}
                  </span>
                </div>

                {c.category && (
                  <p className="text-xs text-amber-300 font-medium mb-1">Category: {c.category}</p>
                )}
                {c.description && <p className="text-xs text-gray-300 mb-1">{c.description}</p>}

                {c.image_data && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(c.image_data || null)}
                      className="flex items-center gap-1.5 text-[10px] text-electric hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Attached Photo
                    </button>
                  </div>
                )}

                {/* Status action buttons for Admin */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(c.submitted_at)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'in_progress')}
                        disabled={acknowledging === c.id}
                        className="px-2.5 py-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg font-bold transition cursor-pointer"
                      >
                        🚚 Dispatch Crew
                      </button>
                    )}

                    {(isPending || isInProgress) && (
                      <button
                        onClick={() => handleUpdateStatus(c.id, 'resolved')}
                        disabled={acknowledging === c.id}
                        className="px-2.5 py-1 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg font-bold transition cursor-pointer"
                      >
                        ✓ Mark Restored
                      </button>
                    )}

                    {isResolved && (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Power Restored
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* CSV Batch Import Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-[#0d1626] border border-purple-500/30 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                Batch Import Complaints via CSV
              </h3>
              <button onClick={() => setShowCSVModal(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div>
                  <p className="font-bold text-purple-300">Need a CSV template?</p>
                  <p className="text-gray-400 text-[11px]">Download sample CSV format to populate outage call center dumps.</p>
                </div>
                <button
                  onClick={handleDownloadSampleCSV}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1 uppercase">Select CSV File</label>
                <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-white/15 hover:border-purple-400 rounded-xl bg-[#050b14] cursor-pointer transition">
                  <Upload className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300 font-medium">Click to upload CSV spreadsheet</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {csvRows.length > 0 && (
                <div>
                  <p className="font-bold text-emerald-400 mb-2">Previewing {csvRows.length} complaints ready for ingestion:</p>
                  <div className="max-h-40 overflow-y-auto border border-white/10 rounded-xl bg-[#050b14] p-2 space-y-1">
                    {csvRows.map((r, idx) => (
                      <div key={idx} className="text-[11px] p-1.5 rounded bg-white/5 flex items-center justify-between text-gray-200">
                        <span>📍 {r.area_name} ({r.category})</span>
                        <span className="font-mono text-gray-400">{r.consumer_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCSVModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCSVImport}
                  disabled={csvRows.length === 0 || importingCSV}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {importingCSV ? 'Importing Batch...' : `Import ${csvRows.length} Records`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo View Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="relative bg-[#0d1626] border border-electric/40 rounded-2xl p-4 max-w-lg w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg bg-black/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-white mb-3">Fault Evidence Photo</h4>
            <img src={selectedPhoto} alt="Fault Photo" className="w-full max-h-96 object-contain rounded-xl border border-white/10" />
          </div>
        </div>
      )}
    </div>
  )
}

