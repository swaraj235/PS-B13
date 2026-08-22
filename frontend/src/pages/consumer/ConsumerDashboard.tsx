import { useState, useEffect } from 'react'
import { 
  Zap, CheckCircle2, AlertTriangle, Clock, Send, Radio, ThumbsUp, Activity, ArrowRight, ShieldCheck, RefreshCw, Layers, PhoneCall, Info, Megaphone
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useGridStore } from '../../store/gridStore'
import { PUNE_FEEDER_ZONES, FeederMap } from '../../components/map/FeederMap'
import { api } from '../../lib/api'
import type { ComplaintResponse } from '../../types'
import { useNavigate } from 'react-router-dom'

export function ConsumerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { latestReadings } = useGridStore()

  const [allZoneComplaints, setAllZoneComplaints] = useState<ComplaintResponse[]>([])
  const [userComplaints, setUserComplaints]       = useState<ComplaintResponse[]>([])
  const [fetching, setFetching]                   = useState(false)
  const [endorsingId, setEndorsingId]             = useState<number | null>(null)
  const [toastMsg, setToastMsg]                   = useState<string | null>(null)

  const registeredZone = PUNE_FEEDER_ZONES[user?.zone_id || 1] || PUNE_FEEDER_ZONES[1]
  const zoneTelemetry  = latestReadings[registeredZone.id]
  const isDisturbed    = zoneTelemetry && (zoneTelemetry.voltage_pu < 0.92 || zoneTelemetry.anomaly_score > 0.4)

  const loadData = async () => {
    setFetching(true)
    try {
      if (user?.email) {
        const uRes = await api.getComplaints(user.email)
        setUserComplaints(uRes.complaints || [])
      }
      const allRes = await api.getComplaints()
      setAllZoneComplaints(allRes.complaints || [])
    } catch {
      // Fallback
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [user?.email])

  const activeZoneOutage = allZoneComplaints.find(
    c => c.section_id === registeredZone.id && (c.status === 'pending' || c.status === 'in_progress')
  )

  const handleEndorseOutage = async (complaintId: number) => {
    setEndorsingId(complaintId)
    try {
      const res = await api.endorseComplaint(complaintId)
      setToastMsg(`Endorsed Ticket #${complaintId}! Total affected count elevated to ${res.impact_count}.`)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Endorsement failed'
      alert(`Error: ${msg}`)
    } finally {
      setEndorsingId(null)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-gray-400 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Full-Width Grid Telemetry Top Banner */}
      <div className={`p-6 rounded-2xl border backdrop-blur-xl transition-all shadow-2xl ${
        isDisturbed || activeZoneOutage
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
              isDisturbed || activeZoneOutage ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isDisturbed || activeZoneOutage ? (
                <AlertTriangle className="w-7 h-7 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{registeredZone.name}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-black/50 text-gray-300 font-mono">
                  {registeredZone.voltage}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-electric/20 text-electric border border-electric/30 font-mono">
                  Section {registeredZone.id}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-white/5 text-gray-400 font-mono">
                  👥 {registeredZone.consumers} Consumers Served
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-300">
                {activeZoneOutage ? (
                  <strong className="text-red-400">🚨 Active Outage Ticket #{activeZoneOutage.id} currently in resolution by MSEDCL field crew!</strong>
                ) : isDisturbed ? (
                  <strong className="text-amber-400">⚠ Low voltage sag detected on feeder section. Telemetry monitoring active.</strong>
                ) : (
                  <span className="text-emerald-400">⚡ Feeder line operating normally at nominal 230V parameters.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all cursor-pointer border border-white/10"
              title="Refresh grid telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin text-electric' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Active Zone Outage Card */}
      {activeZoneOutage && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/40 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                ACTIVE OUTAGE IN YOUR FEEDER ZONE
              </span>
              <span className="text-xs font-mono font-bold text-gray-300">
                Ticket #{activeZoneOutage.id} ({activeZoneOutage.village})
              </span>
            </div>

            <span className="px-3 py-1 rounded-lg bg-black/60 text-amber-300 font-bold font-mono text-xs border border-amber-500/30">
              👥 {activeZoneOutage.impact_count || 1} Residents Affected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#0b1322] border border-amber-500/20 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Outage Category</span>
              <span className="text-white font-bold">{activeZoneOutage.category}</span>
            </div>

            <div className="p-4 bg-[#0b1322] border border-amber-500/20 rounded-xl space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Estimated ETR</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                ~35 mins remaining
              </span>
            </div>

            <div className="p-4 bg-[#0b1322] border border-amber-500/20 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Endorse Priority</span>
                <span className="text-gray-300 text-[11px]">Facing this blackout?</span>
              </div>
              <button
                onClick={() => handleEndorseOutage(activeZoneOutage.id)}
                disabled={endorsingId === activeZoneOutage.id}
                className="px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{endorsingId === activeZoneOutage.id ? 'Updating...' : "Endorse (+1)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main 12-Column Full-Width Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): GIS Map & Telemetry Gauges */}
        <div className="lg:col-span-8 space-y-6">
          {/* GIS Feeder Map Card (Restricted to user's assigned feeder zone) */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 shadow-xl">
            <FeederMap restrictedZoneId={user?.zone_id || 1} />
          </div>

          {/* 4 Telemetry Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
                <span>RMS Voltage</span>
                <Activity className="w-4 h-4 text-electric" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {zoneTelemetry ? (zoneTelemetry.voltage_pu * 230).toFixed(1) : '230.4'} <span className="text-xs font-normal text-gray-400">V</span>
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                PU: {zoneTelemetry ? zoneTelemetry.voltage_pu.toFixed(3) : '1.002'} p.u.
              </p>
            </div>

            <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
                <span>Grid Frequency</span>
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                50.01 <span className="text-xs font-normal text-gray-400">Hz</span>
              </p>
              <p className="text-[10px] text-gray-400">Nominal 50.0 Hz</p>
            </div>

            <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
                <span>Harmonic THD</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white font-mono">
                {zoneTelemetry ? zoneTelemetry.thd_pct.toFixed(1) : '4.2'} <span className="text-xs font-normal text-gray-400">%</span>
              </p>
              <p className="text-[10px] text-gray-400">IEEE 519 Standard Compliant</p>
            </div>

            <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-4 space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase">
                <span>Power Factor</span>
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-purple-300 font-mono">
                {zoneTelemetry ? zoneTelemetry.power_factor.toFixed(2) : '0.98'}
              </p>
              <p className="text-[10px] text-gray-400">Lagging (Target &gt;0.95)</p>
            </div>
          </div>
        </div>

        {/* Right Column (4 Cols): Quick Actions, Advisories Feed & Emergency Contacts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => navigate('/consumer/report')}
              className="p-5 bg-gradient-to-r from-electric/20 to-blue-600/20 border border-electric/40 hover:border-electric rounded-2xl shadow-xl flex items-center justify-between group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-electric/20 flex items-center justify-center text-electric">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-electric transition-colors">Report Power Outage</h4>
                  <p className="text-[11px] text-gray-400">Step-by-step reporting wizard</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-electric group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/consumer/tickets')}
              className="p-5 bg-[#0b1322] border border-white/10 hover:border-white/20 rounded-2xl shadow-xl flex items-center justify-between group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">My Outage Tickets</h4>
                  <p className="text-[11px] text-gray-400">{userComplaints.length} Total Tickets Logged</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* MSEDCL Grid Advisories Board */}
          <div className="bg-[#0b1322] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Megaphone className="w-4 h-4 text-electric" />
                <span>MSEDCL Grid Advisories</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                LIVE BULLETIN
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-400 font-bold uppercase">Scheduled Maintenance</span>
                  <span className="text-gray-500">23 Aug, 10 AM</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-snug">
                  Routine insulator maintenance scheduled for Substation Zone 1 (Kothrud). 15-min momentary interruption expected.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-bold uppercase">Monsoon Grid Safety</span>
                  <span className="text-gray-500">Active Warning</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-snug">
                  High wind advisory in Pune Circle. Please report any tree branch overhangs near 11kV lines immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Helpline Contacts Card */}
          <div className="bg-[#0b1322] border border-amber-500/20 rounded-2xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              Emergency Helpline & Control
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-[#050b14] p-2.5 rounded-xl border border-white/5">
                <span className="text-gray-300">MSEDCL Central Hotline</span>
                <a href="tel:1912" className="text-amber-400 font-bold font-mono hover:underline">1912</a>
              </div>
              <div className="flex justify-between items-center bg-[#050b14] p-2.5 rounded-xl border border-white/5">
                <span className="text-gray-300">Pune Circle Substation Desk</span>
                <a href="tel:02026123456" className="text-electric font-bold font-mono hover:underline">020-26123456</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
