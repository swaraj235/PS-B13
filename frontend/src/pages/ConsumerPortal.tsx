import React, { useState, useEffect } from 'react'
import { 
  Zap, CheckCircle2, AlertTriangle, Clock, Send, ShieldCheck, 
  MapPin, RefreshCw, LogOut, User as UserIcon, Camera, X, Edit3,
  ThumbsUp, Activity, Radio, PhoneCall, Image as ImageIcon, Flame, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useGridStore } from '../store/gridStore'
import { PUNE_FEEDER_ZONES } from '../components/map/FeederMap'
import { api } from '../lib/api'
import type { ComplaintResponse } from '../types'
import { useNavigate } from 'react-router-dom'

const CATEGORY_OPTIONS = [
  { id: 'Total Power Cut / Blackout', label: 'Total Power Cut', icon: Zap, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'Voltage Fluctuation / Dim Lights', label: 'Voltage Sag / Dim', icon: Activity, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'Line Sparking / Cable Snap', label: 'Line Spark / Cable Snap', icon: Flame, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'Transformer Buzzing / Smoke', label: 'Transformer Issue', icon: AlertTriangle, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
]

export function ConsumerPortal() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuthStore()
  const { latestReadings } = useGridStore()

  const [category, setCategory]       = useState('Total Power Cut / Blackout')
  const [description, setDescription] = useState('')
  const [imageData, setImageData]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)

  const [userComplaints, setUserComplaints]   = useState<ComplaintResponse[]>([])
  const [allZoneComplaints, setAllZoneComplaints] = useState<ComplaintResponse[]>([])
  const [fetchingComplaints, setFetchingComplaints] = useState(false)
  const [endorsingId, setEndorsingId]         = useState<number | null>(null)
  const [selectedPhoto, setSelectedPhoto]     = useState<string | null>(null)

  // Edit Profile Modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editName, setEditName]                     = useState(user?.full_name || '')
  const [editPhone, setEditPhone]                   = useState(user?.phone || '')
  const [editZoneId, setEditZoneId]                 = useState(user?.zone_id || 1)
  const [editAvatar, setEditAvatar]                 = useState(user?.avatar_data || '')
  const [updatingProfile, setUpdatingProfile]       = useState(false)

  const registeredZone = PUNE_FEEDER_ZONES[user?.zone_id || 1] || PUNE_FEEDER_ZONES[1]
  const zoneTelemetry = latestReadings[registeredZone.id]
  const isDisturbed = zoneTelemetry && (zoneTelemetry.voltage_pu < 0.92 || zoneTelemetry.anomaly_score > 0.4)

  const loadComplaints = async () => {
    setFetchingComplaints(true)
    try {
      if (user?.email) {
        const userRes = await api.getComplaints(user.email)
        setUserComplaints(userRes.complaints || [])
      }
      const allRes = await api.getComplaints()
      setAllZoneComplaints(allRes.complaints || [])
    } catch {
      // Fallback silent handle
    } finally {
      setFetchingComplaints(false)
    }
  }

  useEffect(() => {
    loadComplaints()
    const interval = setInterval(loadComplaints, 5000)
    return () => clearInterval(interval)
  }, [user?.email])

  // Find active complaint for user's feeder zone
  const activeZoneOutage = allZoneComplaints.find(
    c => c.section_id === registeredZone.id && (c.status === 'pending' || c.status === 'in_progress')
  )

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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 300
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, w, h)
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        setEditAvatar(resizedBase64)
      }
      img.src = reader.result as string
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
        setSuccessMsg(res.message || `Active ticket #${res.id} is already in progress for ${registeredZone.name}. Your report was merged to elevate priority!`)
      } else {
        setSuccessMsg(`Outage ticket #${res.id} registered successfully for ${registeredZone.name}!`)
      }

      setDescription('')
      setImageData(null)
      loadComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      alert(`Error submitting complaint: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEndorseOutage = async (complaintId: number) => {
    setEndorsingId(complaintId)
    try {
      const res = await api.endorseComplaint(complaintId)
      setSuccessMsg(`Endorsed Ticket #${complaintId}! Total affected residents count elevated to ${res.impact_count}.`)
      loadComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Endorsement failed'
      alert(`Error: ${msg}`)
    } finally {
      setEndorsingId(null)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)
    try {
      await updateProfile({
        full_name: editName,
        phone: editPhone,
        zone_id: editZoneId,
        avatar_data: editAvatar,
      })
      setIsEditProfileOpen(false)
      loadComplaints()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile update failed'
      alert(`Error updating profile: ${msg}`)
    } finally {
      setUpdatingProfile(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050b14] text-gray-100 p-4 md:p-8">
      {/* Top Header Bar */}
      <header className="max-w-5xl mx-auto flex items-center justify-between bg-[#0b1322] border border-electric/20 rounded-2xl p-4 mb-6 shadow-2xl flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {user?.avatar_data ? (
              <img src={user.avatar_data} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover border-2 border-electric/40 shadow-lg" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-electric/10 border-2 border-electric/30 flex items-center justify-center shadow-lg">
                <UserIcon className="w-6 h-6 text-electric" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0b1322] rounded-full" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-white flex items-center gap-2 tracking-wide">
              GridSentinel
              <span className="px-2.5 py-0.5 rounded-full bg-electric/15 text-electric border border-electric/30 text-[10px] font-bold uppercase tracking-wider">
                Consumer Portal
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Welcome, <strong className="text-white">{user?.full_name || 'Resident'}</strong> ({user?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="tel:1912"
            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Call MSEDCL Emergency Hotline"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Toll-Free 1912</span>
          </a>

          <button
            onClick={() => {
              setEditName(user?.full_name || '')
              setEditPhone(user?.phone || '')
              setEditZoneId(user?.zone_id || 1)
              setEditAvatar(user?.avatar_data || '')
              setIsEditProfileOpen(true)
            }}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-electric" />
            Edit Profile
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 bg-electric/15 border border-electric/40 text-electric hover:bg-electric/25 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Portal
            </button>
          )}

          <button
            onClick={() => { logout(); navigate('/login') }}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        {/* Live Grid Feeder Telemetry Card */}
        <div className={`p-5 rounded-2xl border backdrop-blur-xl transition-all shadow-xl ${
          isDisturbed || activeZoneOutage
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                isDisturbed || activeZoneOutage ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isDisturbed || activeZoneOutage ? (
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">{registeredZone.name}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/40 text-gray-300 font-mono">
                    {registeredZone.voltage}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-electric/20 text-electric border border-electric/30 font-mono">
                    Section {registeredZone.id}
                  </span>
                </div>
                <p className="text-xs mt-1 text-gray-300">
                  {activeZoneOutage ? (
                    <strong className="text-red-400">🚨 Active Outage Ticket #{activeZoneOutage.id} currently in resolution by MSEDCL field crew!</strong>
                  ) : isDisturbed ? (
                    <strong className="text-amber-400">⚠ Voltage disturbance / sag detected on feeder section. Telemetry monitoring active.</strong>
                  ) : (
                    <span className="text-emerald-400">⚡ Power Grid status nominal. All 11kV distribution transformers operating within threshold.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-electric animate-pulse" />
                <span className="text-gray-400 text-[10px] uppercase font-bold">Telemetry Live</span>
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="font-mono">
                <span className="text-gray-400">V: </span>
                <strong className="text-white">{zoneTelemetry ? (zoneTelemetry.voltage_pu * 230).toFixed(1) : '230.4'}V</strong>
              </div>
              <div className="font-mono hidden sm:block">
                <span className="text-gray-400">Freq: </span>
                <strong className="text-emerald-400">50.0 Hz</strong>
              </div>
              <div className="font-mono hidden sm:block">
                <span className="text-gray-400">THD: </span>
                <strong className="text-electric">{zoneTelemetry ? zoneTelemetry.thd_pct.toFixed(1) : '4.2'}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Active Feeder Outage Alert Banner & Endorsement Card */}
        {activeZoneOutage && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/40 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  ACTIVE OUTAGE IN YOUR ZONE
                </span>
                <span className="text-xs font-mono font-bold text-gray-300">
                  Ticket #{activeZoneOutage.id} ({activeZoneOutage.village})
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Impacted Residents:</span>
                <span className="px-2 py-0.5 rounded bg-black/50 text-amber-300 font-bold font-mono">
                  👥 {activeZoneOutage.impact_count || 1} Reported
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3 bg-[#0b1322] border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Issue Category</span>
                <span className="text-white font-bold">{activeZoneOutage.category}</span>
              </div>

              <div className="p-3 bg-[#0b1322] border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Estimated Restoration (ETR)</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~35 mins remaining
                </span>
              </div>

              <div className="p-3 bg-[#0b1322] border border-amber-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Endorse Priority</span>
                  <span className="text-gray-300 text-[11px]">Affected by this outage?</span>
                </div>
                <button
                  onClick={() => handleEndorseOutage(activeZoneOutage.id)}
                  disabled={endorsingId === activeZoneOutage.id}
                  className="px-3 py-1.5 bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{endorsingId === activeZoneOutage.id ? 'Updating...' : "I'm Also Affected (+1)"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outage Reporting Form */}
          <div className="bg-[#0b1322] border border-electric/20 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Report Outage / Fault</h3>
                    <p className="text-[10px] text-gray-400">Reports are auto-grouped by feeder section to prevent duplicate spam</p>
                  </div>
                </div>
              </div>

              {successMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                  <span className="leading-snug">{successMsg}</span>
                </div>
              )}

              {activeZoneOutage && (
                <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Note: An active outage is already being repaired for your feeder. Submitting below will automatically merge your report into <strong>Ticket #{activeZoneOutage.id}</strong>.</span>
                </div>
              )}

              <form onSubmit={handleSubmitOutage} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Your Registered Feeder Location
                  </label>
                  <div className="flex items-center justify-between bg-[#050b14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-electric" />
                      <span>{registeredZone.name} ({registeredZone.area})</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      SEC {registeredZone.id}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Issue Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORY_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      const isSelected = category === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCategory(opt.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? `${opt.color} ring-2 ring-electric/40 font-bold`
                              : 'bg-[#050b14] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-[11px] leading-tight">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Landmark / Additional Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="E.g. Karve Road near Krishna Hospital landmark, loud bang heard..."
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-electric resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Attach Fault Photo (Optional Evidence)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3.5 py-2 bg-[#050b14] border border-white/15 hover:border-electric/50 text-gray-300 hover:text-white rounded-xl text-xs cursor-pointer transition-all">
                      <Camera className="w-4 h-4 text-electric" />
                      <span>{imageData ? 'Change Photo' : 'Upload Evidence Photo'}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {imageData && (
                      <div className="relative">
                        <img src={imageData} alt="Fault attachment" className="w-10 h-10 object-cover rounded-lg border border-electric/40 shadow" />
                        <button
                          type="button"
                          onClick={() => setImageData(null)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-electric hover:bg-electric/90 text-[#050b14] font-extrabold text-xs rounded-xl shadow-lg shadow-electric/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Registering Ticket...</span>
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

          {/* My Outage Ticket Tracking Card */}
          <div className="bg-[#0b1322] border border-electric/20 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Outage Tickets</h3>
                    <p className="text-[10px] text-gray-400">Live dispatch & restoration progress</p>
                  </div>
                </div>

                <button
                  onClick={loadComplaints}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer border border-white/10"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingComplaints ? 'animate-spin text-electric' : ''}`} />
                </button>
              </div>

              {userComplaints.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-[#050b14]">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-semibold text-gray-200">No active outage tickets</p>
                  <p className="text-[11px] text-gray-400 mt-1">When an outage occurs, your report & live dispatch timeline will render here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {userComplaints.map(c => {
                    const isPending    = c.status === 'pending'
                    const isInProgress = c.status === 'in_progress'
                    const isResolved   = c.status === 'resolved'

                    return (
                      <div key={c.id} className="p-4 rounded-xl bg-[#050b14] border border-white/10 space-y-2.5 transition-all hover:border-electric/30">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-electric">Ticket #{c.id}</span>
                            <span className="text-[10px] text-gray-400 font-mono">SEC {c.section_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.impact_count && c.impact_count > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                👥 {c.impact_count} Impacted
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isResolved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              isInProgress ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {c.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{c.category || 'Power Outage'}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{c.village}</span>
                        </p>
                        {c.description && <p className="text-[11px] text-gray-400 line-clamp-2">{c.description}</p>}

                        {c.image_data && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(c.image_data || null)}
                              className="flex items-center gap-1.5 text-[10px] text-electric hover:underline cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>View Evidence Photo</span>
                            </button>
                          </div>
                        )}

                        {/* 4-Step Resolution Progress Stepper */}
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          <div className="flex justify-between text-[9px] font-bold text-gray-400">
                            <span className={isPending || isInProgress || isResolved ? 'text-electric font-black' : ''}>1. Logged</span>
                            <span className={isInProgress || isResolved ? 'text-amber-400 font-black' : ''}>2. Crew Dispatched</span>
                            <span className={isInProgress || isResolved ? 'text-purple-400 font-black' : ''}>3. Line Repair</span>
                            <span className={isResolved ? 'text-emerald-400 font-black' : ''}>4. Restored</span>
                          </div>

                          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                            <div className={`h-full transition-all duration-500 ${
                              isResolved ? 'w-full bg-emerald-400' :
                              isInProgress ? 'w-2/3 bg-amber-400 animate-pulse' :
                              'w-1/4 bg-electric'
                            }`} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-[#0b1322] border border-electric/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-electric" />
                Edit Profile Information
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="flex items-center gap-4">
                {editAvatar ? (
                  <img src={editAvatar} alt="Profile Avatar" className="w-14 h-14 rounded-2xl object-cover border-2 border-electric shadow-lg" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-electric/10 border-2 border-electric flex items-center justify-center shadow-lg">
                    <UserIcon className="w-7 h-7 text-electric" />
                  </div>
                )}
                <label className="px-3.5 py-2 bg-white/5 border border-white/10 hover:border-electric text-gray-300 hover:text-white rounded-xl cursor-pointer transition-all flex items-center gap-2 font-bold">
                  <Camera className="w-4 h-4 text-electric" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-[#050b14] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-electric"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-[#050b14] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-electric"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1 uppercase">Assigned Zone Substation</label>
                <select
                  value={editZoneId}
                  onChange={e => setEditZoneId(Number(e.target.value))}
                  className="w-full bg-[#050b14] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-electric cursor-pointer"
                >
                  {Object.values(PUNE_FEEDER_ZONES).map(z => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {z.area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-5 py-2 bg-electric hover:bg-electric/90 text-[#050b14] font-extrabold rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  {updatingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
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
