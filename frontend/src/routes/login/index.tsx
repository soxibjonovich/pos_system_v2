import { API_URL } from "@/config"
import { useAuth } from "@/contexts/auth-context"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

/* ===================== CONFIG ===================== */

const PIN_MIN_LENGTH = 4
const PIN_MAX_LENGTH = 6

const USERS_URL = `${API_URL}/api/database/users?status=active`
const LOGIN_URL = `${API_URL}/api/auth/login`
const TOKEN_KEY = "postoken"

/* ===================== ROUTE ===================== */

export const Route = createFileRoute("/login/")({
  component: LoginPage,
})

/* ===================== TYPES ===================== */

interface User {
  id: number
  username: string
  full_name: string
  role: string
  status: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  expires_at: string
  role: string
}


/* ===================== COMPONENT ===================== */

function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, role } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [isDark, setIsDark] = useState(true)

  const isPinValid = useMemo(
    () => pin.length >= PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH,
    [pin]
  )

  /* ===== Check stored token ===== */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const savedRole = localStorage.getItem("posrole")

    if (token && savedRole) {
      login(token, savedRole)
      navigate({
        to: savedRole === "admin" ? "/admin" : "/staff",
        replace: true,
      })
    }
  }, [login, navigate])

  /* ===== Dark mode by time ===== */
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours()
      setIsDark(hour < 6 || hour >= 18)
    }

    updateTheme()
    const timer = setInterval(updateTheme, 60_000)
    return () => clearInterval(timer)
  }, [])

  /* ===== Load users ===== */
  useEffect(() => {
    if (isAuthenticated) return

    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        const res = await fetch(USERS_URL)
        
        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`)
        }

        const data = await res.json()
        const activeUsers = Array.isArray(data) ? data : data.users || []

        setUsers(activeUsers)
        
        if (activeUsers.length === 0) {
          setError("No active users found")
        }
      } catch (err) {
        console.error("Error loading users:", err)
        setError("Failed to load users list")
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [isAuthenticated])

  /* ===== Auto redirect ===== */
  useEffect(() => {
    if (!isAuthenticated || !role) return

    navigate({
      to: role === "admin" ? "/admin" : "/staff",
      replace: true,
    })
  }, [isAuthenticated, role, navigate])

  /* ===== PIN handlers ===== */
  const addPinDigit = (digit: string) => {
    setPin(prev => prev.length < PIN_MAX_LENGTH ? prev + digit : prev)
  }

  const clearPin = () => setPin("")
  const backspacePin = () => setPin(p => p.slice(0, -1))

  /* ===== Login ===== */
  const handleLogin = async () => {
    if (!selectedUser || !isPinValid) return

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          pin: parseInt(pin, 10),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.detail || "Invalid PIN code")
        setPin("")
        return
      }

      const data: LoginResponse = await res.json()
      console.log(data)
      const token = data.access_token
      const userRole = data.role

      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem("posrole", userRole)

      login(token, userRole)

      navigate({
        to: userRole === "admin" ? "/admin" : "/staff",
        replace: true,
      })
    } catch (err) {
      console.error("Login error:", err)
      setError("Network error. Please try again.")
      setPin("")
    } finally {
      setIsLoading(false)
    }
  }

  /* ===== Keyboard handlers ===== */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedUser) return

      if (e.key === 'Enter' && isPinValid) {
        handleLogin()
      } else if (e.key === 'Backspace') {
        backspacePin()
      } else if (e.key === 'Escape') {
        clearPin()
      } else if (/^[0-9]$/.test(e.key)) {
        addPinDigit(e.key)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedUser, isPinValid, pin])

  /* ===================== RENDER ===================== */

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            POS System
          </h1>
          <p className={`text-xl mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Select user and enter PIN
          </p>
        </header>

        <div className={`rounded-2xl p-8 shadow-2xl space-y-8 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          {error && (
            <div className="p-4 rounded-xl text-center bg-red-500/10 text-red-500 border border-red-500">
              {error}
            </div>
          )}

          <section>
            <h3 className={`mb-4 font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              Users
            </h3>

            {loadingUsers ? (
              <p className="text-center text-gray-400">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-400">No users available</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setPin("")
                      setError("")
                    }}
                    className={`p-4 rounded-xl font-medium transition relative
                      ${selectedUser?.id === user.id
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400"
                        : isDark
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                  >
                    <div className="text-sm font-bold">{user.username}</div>
                    <div className={`text-xs mt-1 ${selectedUser?.id === user.id ? "text-indigo-200" : "text-gray-400"}`}>
                      {user.full_name}
                    </div>
                    {user.role === 'admin' && (
                      <span className="absolute top-1 right-1 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <p className={`text-center font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {selectedUser ? `PIN for ${selectedUser.username}` : "Select a user"}
            </p>

            <div
              className={`max-w-sm mx-auto grid gap-2 p-4 border-2 border-dashed rounded-xl text-2xl text-center font-mono
              ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
              style={{ gridTemplateColumns: `repeat(${PIN_MAX_LENGTH}, 1fr)` }}
            >
              {Array.from({ length: PIN_MAX_LENGTH }).map((_, i) => (
                <span key={i}>{pin[i] ? "●" : "•"}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button
                  key={n}
                  disabled={!selectedUser}
                  onClick={() => addPinDigit(String(n))}
                  className="py-5 rounded-xl text-2xl bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {n}
                </button>
              ))}
              <button 
                onClick={clearPin} 
                disabled={!selectedUser || pin.length === 0} 
                className="py-5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                Clear
              </button>
              <button 
                onClick={() => addPinDigit("0")} 
                disabled={!selectedUser} 
                className="py-5 rounded-xl text-2xl bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                0
              </button>
              <button 
                onClick={backspacePin} 
                disabled={!selectedUser || pin.length === 0} 
                className="py-5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-2xl"
              >
                ⌫
              </button>
            </div>
          </section>

          <button
            onClick={handleLogin}
            disabled={!selectedUser || !isPinValid || isLoading}
            className="w-full py-5 rounded-xl bg-indigo-600 text-white text-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          {selectedUser && (
            <p className="text-center text-sm text-gray-400">
              Press Enter to login or Esc to clear PIN
            </p>
          )}
        </div>
      </div>
    </div>
  )
}