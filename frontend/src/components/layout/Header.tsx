import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, Clock, Radio, RotateCcw } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { FAULT_TYPES, SECTION_NAMES } from '../../lib/constants'
import type { FaultTypeKey } from '../../types'

const FAULT_OPTIONS: FaultTypeKey[] = [
  'vegetation_contact',
  'conductor_damage',
  'transformer_overload',
  'illegal_tap',
  'grounding_fault',
]

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { injectFault, resetFault } = useGridStore()
  const [showInject, setShowInject]       = useState(false)
  const [selectedFault, setSelectedFault] = useState<FaultTypeKey>('vegetation_contact')
  const [selectedSection, setSelectedSection] = useState(3)
  const [injecting, setInjecting]         = useState(false)
  const [resetting, setResetting]         = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const now = time.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  })

  async function handleInject() {
    setInjecting(true)
    try {
      await injectFault(selectedSection, selectedFault)
    } finally {
      setInjecting(false)
      setShowInject(false)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetFault()
    } finally {
      setResetting(false)
    }
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/8 bg-[#0a1120]/95 backdrop-blur-sm flex-shrink-0 relative z-20">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-white text-lg tracking-tight">{title}</h2>
        {/* Live badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/12 border border-green-500/25">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-xs font-bold text-green-400 tracking-wider">REALTIME MONITORING</span>
        </div>
      </div>

      {/* Right: Time + Controls */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-700/60 border border-white/8">
          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 font-mono tabular-nums">{now}</span>
        </div>

        {/* AI Outage Discovery Scan Button */}
        <button
          onClick={() => {
            const sec = Math.floor(Math.random() * 5) + 1
            injectFault(sec, 'conductor_damage')
          }}
          className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          title="Run AI telemetry & complaint cluster scan to discover active power outages"
        >
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Run Outage Scan</span>
        </button>

        {/* Reset Grid Button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="btn-ghost flex items-center gap-1.5 text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 py-2 px-3"
          title="Reset grid to normal baseline state"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Resetting...' : 'Reset Grid'}</span>
        </button>

        {/* Inject Fault dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowInject(v => !v)}
            className="btn-danger flex items-center gap-2 text-xs py-2 px-3"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Simulate Fault</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showInject ? 'rotate-180' : ''}`} />
          </button>

          {showInject && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowInject(false)}
              />
              {/* Dropdown panel */}
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#0d1626] border border-white/12 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                  <p className="text-xs font-bold text-red-400 tracking-wider uppercase">Grid Fault Simulator</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Section select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      📍 Target Substation Zone
                    </label>
                    <select
                      value={selectedSection}
                      onChange={e => setSelectedSection(Number(e.target.value))}
                      className="w-full bg-[#111e35] border border-white/12 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-electric appearance-none"
                    >
                      {[1,2,3,4,5].map(i => (
                        <option key={i} value={i}>
                          {SECTION_NAMES[i]?.title ?? `Zone ${i}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fault type select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      ⚠ Grid Issue Type
                    </label>
                    <select
                      value={selectedFault}
                      onChange={e => setSelectedFault(e.target.value as FaultTypeKey)}
                      className="w-full bg-[#111e35] border border-white/12 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-electric appearance-none"
                    >
                      {FAULT_OPTIONS.map(f => (
                        <option key={f} value={f}>{FAULT_TYPES[f]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleInject}
                      disabled={injecting}
                      className="flex-1 btn-danger text-xs py-2"
                    >
                      {injecting ? 'Simulating…' : '⚡ Trigger Simulation'}
                    </button>
                    <button
                      onClick={() => setShowInject(false)}
                      className="btn-ghost text-xs px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
