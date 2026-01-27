import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AuthContextType {
  token: string | null
  role: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setToken: (token: string | null) => void
  setRole: (role: string | null) => void
  login: (token: string, role: string, userId: string) => void
  logout: () => void
  checkAuth: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'postoken'
const ROLE_KEY = 'posrole'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null)
  const [role, setRoleState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedRole = localStorage.getItem(ROLE_KEY)
    
    if (storedToken) {
      setTokenState(storedToken)
    }
    if (storedRole) {
      setRoleState(storedRole)
    }
    
    setIsLoading(false)
  }, [])

  // Sync token changes to localStorage
  const setToken = (newToken: string | null) => {
    setTokenState(newToken)
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }
  
  const setItemInStorage = (newItem: string, key: string) => { 
    localStorage.setItem(key, newItem)
  }

  // Sync role changes to localStorage
  const setRole = (newRole: string | null) => {
    setRoleState(newRole)
    if (newRole) {
      localStorage.setItem(ROLE_KEY, newRole)
    } else {
      localStorage.removeItem(ROLE_KEY)
    }
  }

  // Login helper that sets both token and role
  const login = (newToken: string, newRole: string, userId: string) => {
    setToken(newToken)
    setRole(newRole)
    setItemInStorage(userId, "userId")
  }

  // Logout helper that clears both token and role
  const logout = () => {
    setToken(null)
    setRole(null)
  }

  // Check if user is authenticated by checking localStorage
  const checkAuth = (): boolean => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedRole = localStorage.getItem(ROLE_KEY)
    
    if (storedToken && storedRole) {
      setTokenState(storedToken)
      setRoleState(storedRole)
      return true
    }
    
    return false
  }

  const value: AuthContextType = {
    token,
    role,
    isAuthenticated: !!token,
    isLoading,
    setToken,
    setRole,
    login,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}