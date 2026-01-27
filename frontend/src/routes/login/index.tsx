import { api } from "@/config"
import { useAuth } from "@/contexts/auth-context"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useState } from "react"

const PIN_MIN = 4
const PIN_MAX = 6
const TOKEN_KEY = "postoken"
const ROLE_KEY = "posrole"
const USER_ID_KEY = "userId"

export const Route = createFileRoute("/login/")({
  component: LoginPage,
})

interface User {
  id: number
  username: string
  full_name: string
  role: string
}

interface LoginResponse {
  access_token: string
  role: string
}

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

  const isPinValid = pin.length >= PIN_MIN && pin.length <= PIN_MAX

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const savedRole = localStorage.getItem(ROLE_KEY)
    const userId = localStorage.getItem(USER_ID_KEY)

    if (token && savedRole && userId) {
      login(token, savedRole, userId)
      navigate({ to: savedRole === "admin" ? "/admin" : "/staff", replace: true })
    }
  }, [])

  useEffect(() => {
    const h = new Date().getHours()
    setIsDark(h < 6 || h >= 18)
    const t = setInterval(() => {
      const h = new Date().getHours()
      setIsDark(h < 6 || h >= 18)
    }, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (isAuthenticated) return

    fetch(`${api.auth.base}/${api.auth.users_option}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const u = Array.isArray(d) ? d : d.users || []
        setUsers(u)
        if (!u.length) setError("No active users")
        setLoadingUsers(false)
      })
      .catch(() => {
        setError("Failed to load users")
        setLoadingUsers(false)
      })
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate({ to: role === "admin" ? "/admin" : "/staff", replace: true })
    }
  }, [isAuthenticated, role])

  const addDigit = useCallback((d: string) => {
    setPin(p => p.length < PIN_MAX ? p + d : p)
  }, [])

  const clearPin = useCallback(() => setPin(""), [])
  const backspace = useCallback(() => setPin(p => p.slice(0, -1)), [])

  const handleLogin = useCallback(async () => {
    if (!selectedUser || !isPinValid || isLoading) return

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch(`${api.auth.base}/${api.auth.login}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, pin: parseInt(pin, 10) }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.detail || "Invalid PIN")
        setPin("")
        setIsLoading(false)
        return
      }

      const data: LoginResponse = await res.json()
      const token = data.access_token
      const userRole = data.role

      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(ROLE_KEY, userRole)
      localStorage.setItem(USER_ID_KEY, String(selectedUser.id))

      login(token, userRole, String(selectedUser.id))
      navigate({ to: userRole === "admin" ? "/admin" : "/staff", replace: true })
    } catch {
      setError("Network error")
      setPin("")
      setIsLoading(false)
    }
  }, [selectedUser, isPinValid, isLoading, pin, login, navigate])

  useEffect(() => {
    if (!selectedUser) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isPinValid) handleLogin()
      else if (e.key === "Backspace") backspace()
      else if (e.key === "Escape") clearPin()
      else if (/^[0-9]$/.test(e.key)) addDigit(e.key)
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedUser, isPinValid, handleLogin, backspace, clearPin, addDigit])

  const selectUser = useCallback((u: User) => {
    setSelectedUser(u)
    setPin("")
    setError("")
  }, [])

  const bg = isDark ? "bg-gray-900" : "bg-gray-100"
  const cardBg = isDark ? "bg-gray-800" : "bg-white"
  const text = isDark ? "text-white" : "text-gray-900"
  const textSub = isDark ? "text-gray-300" : "text-gray-600"

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${bg}`}>
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className={`text-4xl font-bold ${text}`}>POS System</h1>
          <p className={`text-xl mt-2 ${textSub}`}>Select user and enter PIN</p>
        </header>

        <div className={`rounded-2xl p-8 shadow-2xl space-y-8 ${cardBg}`}>
          {error && (
            <div className="p-4 rounded-xl text-center bg-red-500/10 text-red-500 border border-red-500">
              {error}
            </div>
          )}

          <section>
            <h3 className={`mb-4 font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Users</h3>

            {loadingUsers ? (
              <p className="text-center text-gray-400">Loading...</p>
            ) : !users.length ? (
              <p className="text-center text-gray-400">No users available</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className={`p-4 rounded-xl font-medium transition relative ${
                      selectedUser?.id === u.id
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400"
                        : isDark
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    <div className="text-sm font-bold">{u.username}</div>
                    <div className={`text-xs mt-1 ${selectedUser?.id === u.id ? "text-indigo-200" : "text-gray-400"}`}>
                      {u.full_name}
                    </div>
                    {u.role === "admin" && (
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
              className={`max-w-sm mx-auto grid gap-2 p-4 border-2 border-dashed rounded-xl text-2xl text-center font-mono ${
                isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
              }`}
              style={{ gridTemplateColumns: `repeat(${PIN_MAX}, 1fr)` }}
            >
              {Array.from({ length: PIN_MAX }, (_, i) => (
                <span key={i}>{pin[i] ? "●" : "•"}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  disabled={!selectedUser}
                  onClick={() => addDigit(String(n))}
                  className="py-5 rounded-xl text-2xl bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={clearPin}
                disabled={!selectedUser || !pin.length}
                className="py-5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                Clear
              </button>
              <button
                onClick={() => addDigit("0")}
                disabled={!selectedUser}
                className="py-5 rounded-xl text-2xl bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                0
              </button>
              <button
                onClick={backspace}
                disabled={!selectedUser || !pin.length}
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
            <p className="text-center text-sm text-gray-400">Press Enter to login or Esc to clear PIN</p>
          )}
        </div>
      </div>
    </div>
  )
}