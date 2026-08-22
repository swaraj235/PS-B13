import React, { useState } from 'react'
import { 
  User as UserIcon, Camera, Save, MapPin, CheckCircle2, ShieldCheck, Zap, Activity, Clock, Layers
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { PUNE_FEEDER_ZONES, FeederMap } from '../../components/map/FeederMap'

export function ConsumerProfile() {
  const { user, updateProfile } = useAuthStore()

  const [editName, setEditName]         = useState(user?.full_name || '')
  const [editPhone, setEditPhone]       = useState(user?.phone || '')
  const [editZoneId, setEditZoneId]     = useState(user?.zone_id || 1)
  const [editAvatar, setEditAvatar]     = useState(user?.avatar_data || '')
  const [updating, setUpdating]         = useState(false)
  const [successMsg, setSuccessMsg]     = useState<string | null>(null)

  const currentZone = PUNE_FEEDER_ZONES[editZoneId] || PUNE_FEEDER_ZONES[1]

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setSuccessMsg(null)
    try {
      await updateProfile({
        full_name: editName,
        phone: editPhone,
        zone_id: editZoneId,
        avatar_data: editAvatar,
      })
      setSuccessMsg('Profile and feeder zone details updated successfully!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile update failed'
      alert(`Error updating profile: ${msg}`)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between bg-[#0b1322] border border-white/10 p-5 rounded-2xl shadow-xl flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">Account & Substation Control Studio</h2>
            <p className="text-xs text-gray-400">Manage identity, contact details, and assigned Pune Feeder Zone</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-electric bg-electric/10 px-3 py-1 rounded-lg border border-electric/30 uppercase">
          {user?.role || 'Consumer'} Account
        </span>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): User Identity Card & GIS Map Embed */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Identity Card */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-4">
              {editAvatar ? (
                <img src={editAvatar} alt="Profile Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-electric shadow-xl" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-electric/10 border-2 border-electric flex items-center justify-center shadow-xl">
                  <UserIcon className="w-10 h-10 text-electric" />
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">{user?.full_name || 'Resident'}</h3>
                <p className="text-xs text-gray-400 font-mono">{user?.email}</p>
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified Consumer
                </span>
              </div>
            </div>

            <div>
              <label className="px-4 py-2.5 bg-[#050b14] border border-white/10 hover:border-electric text-gray-200 hover:text-white rounded-xl cursor-pointer transition-all inline-flex items-center gap-2 font-bold text-xs">
                <Camera className="w-4 h-4 text-electric" />
                <span>Upload New Avatar Photo</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              <p className="text-[10px] text-gray-500 mt-1">Automatic canvas compression up to 300px JPEG</p>
            </div>

            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#050b14] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Feeder Zone</span>
                <span className="text-electric font-bold">{currentZone.name.split(':')[0]}</span>
              </div>
              <div className="p-3 bg-[#050b14] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Voltage</span>
                <span className="text-emerald-400 font-bold">{currentZone.voltage}</span>
              </div>
            </div>
          </div>

          {/* Embedded Map (Restricted to currently active editZoneId) */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 shadow-xl">
            <FeederMap restrictedZoneId={editZoneId} />
          </div>
        </div>

        {/* Right Column (7 Cols): Account Form & Substation Visual Selector */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0b1322] border border-electric/20 rounded-2xl p-6 shadow-2xl space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                  1. Contact Information
                </h3>

                {/* Email Read-only */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase">Account Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-[#050b14]/50 border border-white/5 rounded-xl p-3 text-gray-400 cursor-not-allowed font-mono"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-electric"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1 uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-electric"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Substation Feeder Visual Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>2. Select Assigned Pune Substation Feeder</span>
                  <span className="text-electric font-mono text-[10px]">{currentZone.name}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(PUNE_FEEDER_ZONES).map(z => {
                    const isSelected = editZoneId === z.id
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setEditZoneId(z.id)}
                        className={`p-4 rounded-xl border text-left space-y-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-electric/15 border-electric text-white ring-2 ring-electric/40 shadow-lg'
                            : 'bg-[#050b14] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{z.name}</span>
                          <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {z.voltage}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-tight">{z.area}</p>
                        <p className="text-[10px] text-electric font-mono font-bold">👥 {z.consumers} Consumers</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Save Action Button */}
              <div className="pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-4 bg-electric hover:bg-electric/90 text-[#050b14] font-extrabold text-xs rounded-xl shadow-xl shadow-electric/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{updating ? 'Saving Changes...' : 'Save Profile & Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
