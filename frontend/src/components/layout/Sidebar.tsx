import { NavLink, useNavigate } from 'react-router-dom'
import { Zap, LayoutDashboard, BarChart3, HardHat, FileText, LogOut, Wifi, WifiOff, Shield, ClipboardList } from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { useAuthStore } from '../../store/authStore'
import { formatUptime } from '../../lib/utils'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',         desc: 'Live grid overview' },
  { to: '/complaints', icon: ClipboardList,   label: 'Complaints Triage', desc: 'Verify & bulk import' },
  { to: '/audit-logs', icon: FileText,        label: 'Audit Logs',        desc: 'System event trail' },
  { to: '/analytics',  icon: BarChart3,       label: 'Analytics',         desc: 'Trends & history' },
  { to: '/crew',       icon: HardHat,         label: 'Crew View',         desc: 'Field team dispatch' },
  { to: '/terrashield',icon: Shield,          label: 'TerraShield AI',    desc: 'GNN fault & grounding' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { wsConnected, wsUptime } = useGridStore()
  const { user, logout } = useAuthStore()

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
            <p className="text-[11px] text-gray-400 font-mono tracking-widest mt-0.5">MSEDCL CONTROL</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-3 mb-3">Navigation</p>
        {navItems.map(({ to, icon: Icon, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }: { isActive: boolean }) =>
              `nav-item group ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0 text-electric" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-[10px] text-gray-500 group-hover:text-gray-400">{desc}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* ── User Profile & Connection Status ───────────────────────── */}
      <div className="px-4 pb-5 space-y-3">
        {user ? (
          <div className="p-3 rounded-xl bg-[#050b14] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">{user.full_name}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                user.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {user.role}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-full mt-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 bg-electric text-[#070d18] font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            Sign In / Register
          </button>
        )}

        <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${
          wsConnected
            ? 'bg-green-500/10 border-green-500/25'
            : 'bg-gray-500/10 border-gray-500/20'
        }`}>
          {wsConnected ? (
            <>
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-green-400 leading-tight">CONNECTED</p>
                {wsUptime > 0 && (
                  <p className="text-[9px] text-gray-400 font-mono">Up {formatUptime(wsUptime)}</p>
                )}
              </div>
              <Wifi className="w-3.5 h-3.5 text-green-400 ml-auto" />
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-gray-400 leading-tight">OFFLINE</p>
              </div>
              <WifiOff className="w-3.5 h-3.5 text-gray-500 ml-auto" />
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
