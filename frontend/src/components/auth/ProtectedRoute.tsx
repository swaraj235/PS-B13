import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'consumer'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070d18] text-electric flex items-center justify-center font-mono text-xs font-bold animate-pulse">
        ⚡ Verifying GridSentinel Credentials...
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole && (user.role as string) !== 'admin') {
    return <Navigate to={user.role === 'admin' ? '/' : '/consumer'} replace />
  }

  return <>{children}</>
}
