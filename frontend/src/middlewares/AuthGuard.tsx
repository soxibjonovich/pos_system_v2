import { API_URL } from '@/config'
import { useNavigate } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requireAuth?: boolean
}

const TOKEN_KEY = 'postoken'
const ROLE_KEY = 'posrole'
const USER_ID_KEY = 'userId'

export function AuthGuard({
  children,
  allowedRoles,
  requireAuth = true,
}: AuthGuardProps) {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const role = localStorage.getItem(ROLE_KEY)
    const userId = localStorage.getItem(USER_ID_KEY)

    if (requireAuth && (!token || !userId || !role)) {
      localStorage.clear()
      navigate({ to: '/login', replace: true })
      return
    }

    if (allowedRoles?.length) {
      if (!role || !allowedRoles.includes(role)) {
        const dest = role === 'admin' ? '/admin' : ['staff', 'cashier', 'manager'].includes(role || '') ? '/staff' : '/login'
        if (dest === '/login') localStorage.clear()
        navigate({ to: dest, replace: true })
        return
      }
    }

    setIsChecking(false)
  }, [navigate, allowedRoles, requireAuth])

  useEffect(() => {
    const role = localStorage.getItem(ROLE_KEY)
    if (!['staff'].includes(role || '')) return

    let timer: ReturnType<typeof setTimeout>

    const logout = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        try {
          localStorage.clear()
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
        } catch {}
      }
      navigate({ to: '/login', replace: true })
    }

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(logout, 30000)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => document.addEventListener(e, reset, true))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach(e => document.removeEventListener(e, reset, true))
    }
  }, [navigate])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-gray-300">Checking permissions...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}