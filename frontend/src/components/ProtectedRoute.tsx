import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'staff' | 'any'
}

export function ProtectedRoute({ children, requiredRole = 'any' }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const { isAuthenticated, role, login } = useAuth()

  useEffect(() => {
    const token = localStorage.getItem('postoken')
    const savedRole = localStorage.getItem('posrole')

    // No credentials found - redirect to login
    if (!token || !savedRole) {
      console.log('No credentials found, redirecting to login')
      navigate({ to: '/login', replace: true })
      return
    }

    // Credentials exist but auth context not hydrated - hydrate it
    if (!isAuthenticated && token && savedRole) {
      console.log('Hydrating auth context from localStorage')
      login(token, savedRole)
      return
    }

    // Check role permissions
    if (requiredRole !== 'any' && role) {
      if (requiredRole === 'admin' && role !== 'admin') {
        console.log('Admin access required, redirecting to staff')
        navigate({ to: '/staff', replace: true })
        return
      }
      
      if (requiredRole === 'staff' && role === 'admin') {
        console.log('Staff-only route accessed by admin, redirecting to admin')
        navigate({ to: '/admin', replace: true })
        return
      }
    }
  }, [isAuthenticated, role, navigate, login, requiredRole])

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for easy access to protected route logic
export function useRequireAuth(requiredRole?: 'admin' | 'staff' | 'any') {
  const navigate = useNavigate()
  const { isAuthenticated, role, login } = useAuth()

  useEffect(() => {
    const token = localStorage.getItem('postoken')
    const savedRole = localStorage.getItem('posrole')

    if (!token || !savedRole) {
      navigate({ to: '/login', replace: true })
      return
    }

    if (!isAuthenticated && token && savedRole) {
      login(token, savedRole)
      return
    }

    if (requiredRole && requiredRole !== 'any' && role) {
      if (requiredRole === 'admin' && role !== 'admin') {
        navigate({ to: '/staff', replace: true })
      } else if (requiredRole === 'staff' && role === 'admin') {
        navigate({ to: '/admin', replace: true })
      }
    }
  }, [isAuthenticated, role, navigate, login, requiredRole])

  return { isAuthenticated, role }
}