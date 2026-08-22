import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, ShieldCheck, UserCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const [activeTab, setActiveTab] = useState<'consumer' | 'admin'>('consumer')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.login({ email, password })
      setAuth(res.user, res.access_token)
      if (res.user.role === 'admin') {
        navigate('/')
      } else {
        navigate('/consumer')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (role: 'consumer' | 'admin') => {
    setError(null)
    setLoading(true)
    const demoEmail = role === 'admin' ? 'admin@msedcl.in' : 'consumer@pune.in'
    const demoPass  = role === 'admin' ? 'admin123' : 'user123'

    try {
      const res = await api.login({ email: demoEmail, password: demoPass })
      setAuth(res.user, res.access_token)
      if (res.user.role === 'admin') {
        navigate('/')
      } else {
        navigate('/consumer')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070d18] text-gray-100 flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-electric/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d1626]/90 border border-electric/20 backdrop-blur-xl rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric/10 border border-electric/30 text-electric text-xs font-bold mb-3">
            <Zap className="w-4 h-4 text-electric animate-pulse" />
            GridSentinel Portal
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            Sign In to {activeTab === 'admin' ? 'Utility Admin' : 'Consumer Portal'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-Time Telemetry & Outage Management — Pune Circle
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex bg-[#050b14] p-1 rounded-xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('consumer'); setEmail('consumer@pune.in'); setPassword('user123'); setError(null) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'consumer'
                ? 'bg-electric text-[#070d18] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Consumer App
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setEmail('admin@msedcl.in'); setPassword('admin123'); setError(null) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'admin'
                ? 'bg-electric text-[#070d18] shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Utility Admin
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={activeTab === 'admin' ? 'admin@msedcl.in' : 'consumer@pune.in'}
                className="w-full pl-9 pr-4 py-2.5 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-[#050b14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-electric transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-electric hover:bg-electric/90 text-[#070d18] font-bold text-xs rounded-xl shadow-lg shadow-electric/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In as {activeTab === 'admin' ? 'MSEDCL Admin' : 'Consumer'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick-Login Buttons */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center space-y-2">
          <p className="text-[11px] text-gray-400 font-semibold mb-2">⚡ Quick 1-Click Demo Login</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('consumer')}
              className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[11px] font-bold rounded-xl transition-all"
            >
              👤 Consumer Demo
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[11px] font-bold rounded-xl transition-all"
            >
              ⚡ Admin Demo
            </button>
          </div>
        </div>

        {/* Signup Link */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-electric hover:underline font-bold">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
