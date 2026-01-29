import { API_URL } from '@/config'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  requireAuth?: boolean
}

const TOKEN_KEY = 'postoken'
const ROLE_KEY = 'posrole'
const USER_ID_KEY = 'userId'
const INACTIVITY_TIMEOUT = 30000

export function AuthGuard({
  children,
  allowedRoles,
  requireAuth = true,
}: AuthGuardProps) {
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasCheckedRef = useRef(false)
  const hasSetupAutoLogoutRef = useRef(false)

  useEffect(() => {
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true

    const token = localStorage.getItem(TOKEN_KEY)
    const role = localStorage.getItem(ROLE_KEY)
    const userId = localStorage.getItem(USER_ID_KEY)

    if (requireAuth && (!token || !userId || !role)) {
      localStorage.clear()
      navigate({ to: '/login', replace: true })
      return
    }

    if (allowedRoles?.length && role) {
      if (!allowedRoles.includes(role)) {
        const dest = role === 'admin' ? '/admin' : ['staff', 'cashier', 'manager'].includes(role) ? '/staff' : '/login'
        if (dest === '/login') localStorage.clear()
        navigate({ to: dest, replace: true })
        return
      }
    }

    setIsAuthorized(true)
    setIsChecking(false)
  }, [])

  useEffect(() => {
    if (!isAuthorized || hasSetupAutoLogoutRef.current) return
    
    const role = localStorage.getItem(ROLE_KEY)
    if (!role || !['staff', 'cashier', 'manager'].includes(role)) return

    hasSetupAutoLogoutRef.current = true

    const logout = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      
      if (token) {
        fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {})
      }
      
      localStorage.clear()
      window.location.href = '/login'
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach(e => document.removeEventListener(e, resetTimer))
    }
  }, [isAuthorized])

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