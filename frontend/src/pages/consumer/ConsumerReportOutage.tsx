import React, { useState, useEffect } from 'react'
import { 
  Send, CheckCircle2, AlertTriangle, MapPin, Camera, X, Flame, Activity, Zap, Radio, ChevronRight, ShieldAlert, Layers
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { PUNE_FEEDER_ZONES, FeederMap } from '../../components/map/FeederMap'
import { api } from '../../lib/api'
import type { ComplaintResponse } from '../../types'
import { useNavigate } from 'react-router-dom'

const CATEGORY_OPTIONS = [
  { id: 'Total Power Cut / Blackout', label: 'Total Power Cut', icon: Zap, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'Voltage Fluctuation / Dim Lights', label: 'Voltage Sag / Dim', icon: Activity, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'Line Sparking / Cable Snap', label: 'Line Spark / Cable Snap', icon: Flame, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'Transformer Buzzing / Smoke', label: 'Transformer Issue', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
]

export function ConsumerReportOutage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [category, setCategory]       = useState('Total Power Cut / Blackout')
  const [description, setDescription] = useState('')
  const [imageData, setImageData]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)
  const [activeZoneOutage, setActiveZoneOutage] = useState<ComplaintResponse | null>(null)

  const registeredZone = PUNE_FEEDER_ZONES[user?.zone_id || 1] || PUNE_FEEDER_ZONES[1]

  useEffect(() => {
    const checkActiveOutages = async () => {
      try {
        const res = await api.getComplaints()
        const match = (res.complaints || []).find(
          c => c.section_id === registeredZone.id && (c.status === 'pending' || c.status === 'in_progress')
        )
        setActiveZoneOutage(match || null)
      } catch {
        // Silent error
      }
    }
    checkActiveOutages()
  }, [registeredZone.id])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Image size should be less than 3MB.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageData(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitOutage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMsg(null)

    try {
      const res = await api.submitComplaint({
        village: registeredZone.area.split(',')[0],
        category,
        description,
        section_id: registeredZone.id,
        image_data: imageData || undefined,
      })

      if (res.duplicate_merged) {
        setSuccessMsg(res.message || `Active ticket #${res.id} is already in progress. Your report was merged to elevate ticket priority!`)
      } else {
        setSuccessMsg(`Outage ticket #${res.id} registered successfully for ${registeredZone.name}!`)
      }

      setDescription('')
      setImageData(null)
      setTimeout(() => {
        navigate('/consumer/tickets')
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      alert(`Error submitting complaint: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Title Bar */}
      <div className="flex items-center justify-between bg-[#0b1322] border border-white/10 p-5 rounded-2xl shadow-xl flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">Outage & Fault Reporting Studio</h2>
            <p className="text-xs text-gray-400">Report power interruptions & verify feeder line on live GIS map</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-electric bg-electric/10 px-3 py-1 rounded-lg border border-electric/30">
            Section {registeredZone.id}: {registeredZone.name}
          </span>
        </div>
      </div>

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 Cols): Outage Submission Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#0b1322] border border-electric/20 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Feedback Message */}
            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 shadow-lg">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                <div className="space-y-1">
                  <p className="font-bold">{successMsg}</p>
                  <p className="text-[11px] text-emerald-400/80">Redirecting to My Tickets tracking view...</p>
                </div>
              </div>
            )}

            {/* Active Outage Notice */}
            {activeZoneOutage && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
                <Radio className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                <div className="leading-tight">
                  <strong>Active Outage Ticket #{activeZoneOutage.id} is already open for {registeredZone.name}.</strong>
                  <p className="text-[11px] text-amber-400/80 mt-1">Submitting another report will automatically merge into Ticket #{activeZoneOutage.id} to elevate crew dispatch urgency.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitOutage} className="space-y-5">
              {/* Registered Feeder Location */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  1. Your Feeder Substation Location
                </label>
                <div className="flex items-center justify-between bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-medium">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4.5 h-4.5 text-electric" />
                    <div>
                      <p className="font-bold text-white">{registeredZone.name}</p>
                      <p className="text-[11px] text-gray-400">{registeredZone.area}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded border border-white/10">
                    {registeredZone.voltage}
                  </span>
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  2. Select Outage / Fault Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORY_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    const isSelected = category === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCategory(opt.id)}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? `${opt.color} ring-2 ring-electric/40 font-bold shadow-lg`
                            : 'bg-[#050b14] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-xs leading-snug">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  3. Description & Specific Landmark
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Provide specific landmark (e.g. Karve Nagar near Maruti temple, heavy spark heard on pole #4B)..."
                  className="w-full bg-[#050b14] border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-electric resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  4. Evidence Photo Attachment (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-3 bg-[#050b14] border border-white/15 hover:border-electric/50 text-gray-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all">
                    <Camera className="w-4 h-4 text-electric" />
                    <span>{imageData ? 'Change Photo' : 'Upload Evidence Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>

                  {imageData && (
                    <div className="relative">
                      <img src={imageData} alt="Attachment" className="w-14 h-14 object-cover rounded-xl border-2 border-electric/40 shadow-lg" />
                      <button
                        type="button"
                        onClick={() => setImageData(null)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-electric hover:bg-electric/90 text-[#050b14] font-extrabold text-xs rounded-xl shadow-xl shadow-electric/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Registering Outage Ticket...</span>
                ) : (
                  <>
                    <span>Submit Outage Ticket</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (6 Cols): Embedded Interactive GIS Feeder Map & Guidelines */}
        <div className="lg:col-span-6 space-y-6">
          {/* Embedded Feeder Map Card (Restricted to user's assigned zone) */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 shadow-xl">
            <FeederMap restrictedZoneId={user?.zone_id || 1} />
          </div>

          {/* Outage Safety Rules Card */}
          <div className="bg-[#0b1322] border border-amber-500/20 rounded-2xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Electrical Line Safety Guidelines
            </h4>
            <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
              <li>Keep at least <strong>10 meters distance</strong> from any snapped overhead conductors or sparked wires.</li>
              <li>Do not touch damp metal poles or trees contacting power lines during rain.</li>
              <li>In case of transformer smoke, dial <strong>1912</strong> immediately.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
