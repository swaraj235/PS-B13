import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
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
  const { injectFault, activeAlert } = useGridStore()
  const [showInject, setShowInject] = useState(false)
  const [selectedFault, setSelectedFault] = useState<FaultTypeKey>('vegetation_contact')
  const [selectedSection, setSelectedSection] = useState(3)
  const [injecting, setInjecting] = useState(false)

  const now = new Date().toLocaleString('en-IN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
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
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-navy-800/50 backdrop-blur flex-shrink-0 relative z-10">
      <h2 className="font-head font-semibold text-white text-lg">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Live badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fault-normal/10 border border-fault-normal/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fault-normal opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fault-normal" />
          </span>
          <span className="text-xs font-mono font-semibold text-fault-normal">LIVE</span>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 font-mono hidden md:block">{now}</span>

        {/* Inject Fault */}
        <div className="relative">
          <button onClick={() => setShowInject(v => !v)} className="btn-danger flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Inject Fault
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInject ? 'rotate-180' : ''}`} />
          </button>

          {showInject && (
            <div className="absolute right-0 top-full mt-2 w-64 card border border-white/10 z-50 space-y-3 animate-fade-in">
              <p className="text-xs text-gray-400 font-mono">DEMO FAULT INJECTION</p>
              <div className="space-y-2">
                <label className="block text-xs text-gray-400">Section</label>
                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(Number(e.target.value))}
                  className="w-full bg-navy-600 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  {[1,2,3,4,5].map(i => (
                    <option key={i} value={i}>Section {i}</option>
                  ))}
                </select>
                <label className="block text-xs text-gray-400">Fault Type</label>
                <select
                  value={selectedFault}
                  onChange={e => setSelectedFault(e.target.value as FaultTypeKey)}
                  className="w-full bg-navy-600 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  {FAULT_OPTIONS.map(f => (
                    <option key={f} value={f}>{FAULT_TYPES[f]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleInject} disabled={injecting} className="btn-danger flex-1 text-xs">
                  {injecting ? 'Injecting…' : 'Inject Now'}
                </button>
                <button onClick={() => setShowInject(false)} className="btn-ghost text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
