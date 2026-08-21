import { NavLink } from 'react-router-dom'
import { Zap, LayoutDashboard, BarChart3, HardHat, Wifi, WifiOff, Activity } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { formatUptime } from '../../lib/utils'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  desc: 'Live grid overview' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics',  desc: 'Trends & history' },
  { to: '/crew',      icon: HardHat,         label: 'Crew View',  desc: 'Field team dispatch' },
]

export function Sidebar() {
  const { wsConnected, wsUptime } = useGridStore()

  return (
    <aside className="flex flex-col w-[230px] min-h-screen bg-[#0a1120] border-r border-white/8 flex-shrink-0">

      {/* ── Logo ───────────────────────────────────── */}
      <div className="px-5 py-6 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-electric/20 border border-electric/30 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-electric" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight tracking-tight">GridSentinel</h1>
            <p className="text-[11px] text-gray-400 font-mono tracking-widest mt-0.5">GRID MONITOR</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-3">Navigation</p>
        {navItems.map(({ to, icon: Icon, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item group ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm">{label}</span>
              <span className="text-[10px] text-gray-500 group-hover:text-gray-400">{desc}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* ── Connection Status ───────────────────────── */}
      <div className="px-4 pb-5 space-y-3">
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          wsConnected
            ? 'bg-green-500/10 border-green-500/25'
            : 'bg-gray-500/10 border-gray-500/20'
        }`}>
          {wsConnected ? (
            <>
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <div>
                <p className="text-xs font-bold text-green-400 leading-tight">CONNECTED</p>
                {wsUptime > 0 && (
                  <p className="text-[10px] text-gray-400 font-mono">Up {formatUptime(wsUptime)}</p>
                )}
              </div>
              <Wifi className="w-4 h-4 text-green-400 ml-auto" />
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-gray-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-400 leading-tight">OFFLINE</p>
                <p className="text-[10px] text-gray-500">No backend connection</p>
              </div>
              <WifiOff className="w-4 h-4 text-gray-500 ml-auto" />
            </>
          )}
        </div>

        <div className="px-3 py-2 rounded-xl bg-electric/8 border border-electric/20 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-electric flex-shrink-0" />
          <span className="text-[11px] font-bold text-electric tracking-wider">MOCK DATA MODE</span>
        </div>
      </div>
    </aside>
  )
}
