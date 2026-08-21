import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, Clock, Radio } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { FAULT_TYPES } from '../../lib/constants'
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
  const { injectFault } = useGridStore()
  const [showInject, setShowInject]       = useState(false)
  const [selectedFault, setSelectedFault] = useState<FaultTypeKey>('vegetation_contact')
  const [selectedSection, setSelectedSection] = useState(3)
  const [injecting, setInjecting]         = useState(false)
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
          <span className="text-xs font-bold text-green-400 tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Right: Time + Inject */}
      <div className="flex items-center gap-4">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-700/60 border border-white/8">
          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-300 font-mono tabular-nums">{now}</span>
        </div>

        {/* Inject Fault dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowInject(v => !v)}
            className="btn-danger flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Inject Fault</span>
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
                  <p className="text-xs font-bold text-red-400 tracking-wider uppercase">Demo Fault Injection</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Section select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      📍 Target Section
                    </label>
                    <select
                      value={selectedSection}
                      onChange={e => setSelectedSection(Number(e.target.value))}
                      className="w-full bg-[#111e35] border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-electric appearance-none"
                    >
                      {[1,2,3,4,5].map(i => (
                        <option key={i} value={i}>Section {i}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fault type select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      ⚠ Fault Type
                    </label>
                    <select
                      value={selectedFault}
                      onChange={e => setSelectedFault(e.target.value as FaultTypeKey)}
                      className="w-full bg-[#111e35] border border-white/12 rounded-xl px-3 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-electric appearance-none"
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
                      className="flex-1 btn-danger text-sm"
                    >
                      {injecting ? 'Injecting…' : '⚡ Inject Now'}
                    </button>
                    <button
                      onClick={() => setShowInject(false)}
                      className="btn-ghost text-sm px-3"
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
