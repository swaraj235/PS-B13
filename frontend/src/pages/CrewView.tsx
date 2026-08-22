import { useState } from 'react'
import { MapPin, CheckSquare, Square, AlertTriangle, Navigation, ChevronRight, Phone, ShieldCheck, UserCheck, Truck, Clock, RefreshCw, Zap } from 'lucide-react'
import { useGridStore } from '../store/gridStore'
import { faultTypeLabel } from '../lib/utils'
import { Header } from '../components/layout/Header'

const SUBSTATION_COORDS: Record<number, { name: string; coords: string; eta: string; lead: string; phone: string; vehicle: string }> = {
  1: { name: 'Kothrud 11kV Substation', coords: '18.5074° N, 73.8077° E', eta: '8 min', lead: 'Ramesh Patil (Crew Alpha)', phone: '+91 98230 11045', vehicle: 'MH-12-GS-4921 (Bucket Truck)' },
  2: { name: 'Paud Rd Branch Substation', coords: '18.5158° N, 73.8130° E', eta: '10 min', lead: 'Suresh Shinde (Crew Beta)', phone: '+91 98230 22091', vehicle: 'MH-12-GS-1022 (Utility Van)' },
  3: { name: 'Kondhwa 22/11kV Substation', coords: '18.4722° N, 73.8860° E', eta: '14 min', lead: 'Vikas Jadhav (Crew Gamma)', phone: '+91 98230 33182', vehicle: 'MH-12-GS-3390 (High-Reach Crane)' },
  4: { name: 'Hadapsar 22kV Industrial Sub', coords: '18.5089° N, 73.9259° E', eta: '12 min', lead: 'Anil Deshmukh (Crew Delta)', phone: '+91 98230 44810', vehicle: 'MH-12-GS-4081 (Heavy Recovery Unit)' },
  5: { name: 'Swargate 11kV Central Sub', coords: '18.5018° N, 73.8586° E', eta: '6 min', lead: 'Ganesh More (Crew Epsilon)', phone: '+91 98230 55901', vehicle: 'MH-12-GS-5012 (Rapid Response Car)' },
}

const SAFETY_CHECKS = [
  'PPE equipment donned (Insulated gloves, helmet, Arc-flash shield)',
  'Work permit obtained from MSEDCL Load Dispatch Center',
  'Substation area cordoned off & warning cones deployed',
  'Lockout/Tagout (LOTO) applied on primary bus switch',
  'Line grounding earth stick connected & phase verified dead',
]

export default function CrewView() {
  const { activeAlert, selectedSectionId, setSelectedSectionId, switchSteps, sections } = useGridStore()
  const [checked, setChecked] = useState<boolean[]>(SAFETY_CHECKS.map((_, i) => i < 2))
  const [currentStep, setCurrentStep] = useState(1)
  const [dispatched, setDispatched] = useState(false)
  const [crewStatus, setCrewStatus] = useState<'EN_ROUTE' | 'ON_SITE' | 'REPAIRING' | 'RESOLVED'>('EN_ROUTE')

  const activeSecId = selectedSectionId || activeAlert?.section_id || 3
  const activeSubstation = SUBSTATION_COORDS[activeSecId] || SUBSTATION_COORDS[3]
  const currentSecObj = sections.find(s => s.id === activeSecId)

  const toggle = (i: number) => setChecked(c => c.map((v, idx) => idx === i ? !v : v))
  const doneCount = checked.filter(Boolean).length

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#080d1a] space-y-6">
      <Header title="Field Crew Lineman Operations Studio" />

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* Section Switcher Banner */}
        <div className="bg-[#0d1626] border border-electric/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-electric" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Select Substation Crew Zone:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map(id => (
              <button
                key={id}
                onClick={() => setSelectedSectionId(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeSecId === id
                    ? 'bg-electric text-[#070d18] shadow'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                Zone {id}
              </button>
            ))}
          </div>
        </div>

        {/* Dispatch Banner */}
        <div className={`card border-2 p-6 rounded-2xl shadow-2xl transition-all ${
          currentSecObj?.status === 'critical' 
            ? 'border-red-500/40 bg-red-500/10 shadow-red-500/10' 
            : 'border-electric/30 bg-[#0d1626]'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                currentSecObj?.status === 'critical' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-electric/20 text-electric'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  {currentSecObj?.status === 'critical' ? `CRITICAL OUTAGE INCIDENT — ZONE ${activeSecId}` : `NORMAL OPERATIONS — ZONE ${activeSecId}`}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-electric border border-electric/30">
                    {activeSubstation.name}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Lineman Dispatch & Live Telemetry Tracking Unit
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                crewStatus === 'EN_ROUTE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :
                crewStatus === 'ON_SITE' ? 'bg-electric/20 text-electric border-electric/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {crewStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-xs">
            <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Assigned Lineman Lead</span>
              <p className="text-sm font-bold text-white">{activeSubstation.lead}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Service Vehicle</span>
              <p className="text-xs font-mono font-bold text-electric flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> {activeSubstation.vehicle}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Contact Hotline</span>
              <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {activeSubstation.phone}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#050b14] border border-white/5 space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Substation GPS & ETA</span>
              <p className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> ETA {activeSubstation.eta}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setDispatched(true)
                setCrewStatus(s => s === 'EN_ROUTE' ? 'ON_SITE' : s === 'ON_SITE' ? 'REPAIRING' : 'RESOLVED')
              }}
              className={`py-3 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                dispatched
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-electric hover:bg-electric/90 text-[#070d18]'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>{dispatched ? `✓ Status Updated: ${crewStatus.replace('_', ' ')}` : `Dispatch Lineman Crew to Zone ${activeSecId}`}</span>
            </button>

            <a
              href={`https://maps.google.com/?q=${activeSubstation.coords}`}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-electric" />
              <span>Open Substation GPS Route ({activeSubstation.coords})</span>
            </a>
          </div>
        </div>

        {/* Safety Checklist */}
        <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-electric" />
              Pre-Work Field Safety & LOTO Protocol
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              {doneCount}/{SAFETY_CHECKS.length} Verified
            </span>
          </div>

          <div className="h-2 bg-[#050b14] rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(doneCount / SAFETY_CHECKS.length) * 100}%` }}
            />
          </div>

          <div className="space-y-2.5">
            {SAFETY_CHECKS.map((check, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer ${
                  checked[i]
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold'
                    : 'border-white/5 bg-[#050b14] text-gray-300 hover:border-white/20'
                }`}
              >
                {checked[i] ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <span className="text-xs">{check}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Isolation Switching Sequence */}
        {switchSteps.length > 0 && (
          <div className="bg-[#0d1626] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" />
                Feeder Isolation & Tie Switching Checklist
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">Step {currentStep} of {switchSteps.length}</span>
            </div>

            <div className="space-y-2.5">
              {switchSteps.map((step, idx) => {
                const state = idx + 1 < currentStep ? 'done' : idx + 1 === currentStep ? 'active' : 'pending'
                return (
                  <div key={step.step_number} className={`p-4 rounded-xl border transition-all ${
                    state === 'done'   ? 'border-emerald-500/40 bg-emerald-500/10' :
                    state === 'active' ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/10' :
                                        'border-white/5 bg-[#050b14] opacity-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        state === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                        state === 'active' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-400'}`}
                      >
                        {state === 'done' ? '✓ DONE' : state === 'active' ? '⟳ IN PROGRESS' : 'PENDING'}
                      </span>
                      <span className="text-[10px] font-mono text-electric font-bold">{step.switch_id}</span>
                    </div>
                    <p className="text-xs text-white font-bold">{step.action}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Safety check: {step.safety_check}</p>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setCurrentStep(s => Math.min(s + 1, switchSteps.length))}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-[#070d18] font-extrabold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              ✓ Confirm Switching Step {currentStep} Executed
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
