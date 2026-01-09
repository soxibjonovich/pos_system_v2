import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

/* ===================== CONFIG ===================== */

const PIN_MIN_LENGTH = 4
const PIN_MAX_LENGTH = 6

const USERS_URL = "http://127.0.0.1:8003/users/login-options"
const LOGIN_URL = "http://127.0.0.1:8003/login"
const TOKEN_KEY = "postoken"

/* ===================== ROUTE ===================== */

export const Route = createFileRoute("/login/")({
  component: LoginPage,
})

/* ===================== TYPES ===================== */

interface User {
  id: number | string
  username: string
  role?: string
}

interface UsersResponse {
  users: User[]
}

interface LoginResponse {
  token?: string
  access_token?: string
  role: string
}

/* ===================== COMPONENT ===================== */

function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, role } = useAuth()

  /* ---------- State ---------- */

  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [isDark, setIsDark] = useState(true)

  /* ---------- Derived ---------- */

  const isPinValid = useMemo(
    () => pin.length >= PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH,
    [pin]
  )

  /* =====================================================
     🔐 CHECK LOCAL STORAGE TOKEN (FIRST)
     ===================================================== */

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const savedRole = localStorage.getItem("posrole")

    if (token && savedRole) {
      // hydrate auth context
      login(token, savedRole)

      navigate({
        to: savedRole === "admin" ? "/admin" : "/staff",
        replace: true,
      })
    }
  }, [login, navigate])

  /* ---------- Dark mode by time ---------- */

  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours()
      setIsDark(hour < 6 || hour >= 18)
    }

    updateTheme()
    const timer = setInterval(updateTheme, 60_000)
    return () => clearInterval(timer)
  }, [])

  /* ---------- Load users ---------- */

  useEffect(() => {
    if (isAuthenticated) return // 🔒 skip if auto-logged in

    const loadUsers = async () => {
      try {
        setLoadingUsers(true)
        const res = await fetch(USERS_URL)
        if (!res.ok) throw new Error()

        const data: UsersResponse = await res.json()
        setUsers(data.users ?? [])
      } catch {
        setError("Ошибка загрузки списка пользователей")
        setError("Ошибка загрузки списка пользователей")
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [isAuthenticated])

  /* ---------- Auto redirect (context-based) ---------- */

  useEffect(() => {
    if (!isAuthenticated || !role) return

    navigate({
      to: role === "admin" ? "/admin" : "/staff",
      replace: true,
    })
  }, [isAuthenticated, role, navigate])

  /* ---------- PIN handlers ---------- */

  const addPinDigit = (digit: string) => {
    setPin(prev =>
      prev.length < PIN_MAX_LENGTH ? prev + digit : prev
    )
  }

  const clearPin = () => setPin("")
  const backspacePin = () => setPin(p => p.slice(0, -1))

  /* ---------- Login ---------- */

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
          pin,
        }),
      })

      const data: LoginResponse = await res.json()

      if (!res.ok) {
        setError("Неверный PIN-код")
        setPin("")
        return
      }

      const token = data.token ?? data.access_token ?? ""

      // persist token
      console.log(data)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem("posrole", data.role)

      login(token, data.role)

      navigate({
        to: data.role === "admin" ? "/admin" : "/staff",
        replace: true,
      })
    } catch {
      setError("Ошибка сети. Попробуйте снова.")
    } finally {
      setIsLoading(false)
    }
  }

  /* ===================== RENDER ===================== */

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-6 ${
        isDark ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8">
          <h1 className={`text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            POS System
          </h1>
          <p className={`text-xl mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Выберите пользователя и введите PIN
          </p>
        </header>

        <div className={`rounded-2xl p-8 shadow-2xl space-y-8 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          {error && (
            <div className="p-4 rounded-xl text-center bg-red-500/10 text-red-500 border border-red-500">
              {error}
            </div>
          )}

          {/* ---------- Users ---------- */}
          <section>
            <h3 className={`mb-4 font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              Пользователи
            </h3>

            {loadingUsers ? (
              <p className="text-center text-gray-400">Загрузка...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setPin("")
                    }}
                    className={`p-4 rounded-xl font-medium transition
                      ${
                        selectedUser?.id === user.id
                          ? "bg-indigo-600 text-white"
                          : isDark
                          ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                  >
                    {user.username}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ---------- PIN ---------- */}
          <section className="space-y-4">
            <p className={`text-center font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {selectedUser ? `PIN для ${selectedUser.username}` : "Выберите пользователя"}
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
                  className="py-5 rounded-xl text-2xl bg-gray-700 text-white disabled:opacity-40"
                >
                  {n}
                </button>
              ))}
              <button onClick={clearPin} disabled={!selectedUser} className="py-5 rounded-xl bg-red-600 text-white disabled:opacity-40">
                Очистить
              </button>
              <button onClick={() => addPinDigit("0")} disabled={!selectedUser} className="py-5 rounded-xl bg-gray-700 text-white disabled:opacity-40">
                0
              </button>
              <button onClick={backspacePin} disabled={!selectedUser} className="py-5 rounded-xl bg-orange-600 text-white disabled:opacity-40">
                ⌫
              </button>
            </div>
          </section>

          <button
            onClick={handleLogin}
            disabled={!selectedUser || !isPinValid || isLoading}
            className="w-full py-5 rounded-xl bg-indigo-600 text-white text-lg font-bold disabled:opacity-50"
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </div>
      </div>
    </div>
  )
}
