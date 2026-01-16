import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export const Route = createFileRoute("/")({
  component: IndexRoute,
})

function IndexRoute() {
  const navigate = useNavigate()
  const { isAuthenticated, role, isLoading, checkAuth } = useAuth()

  useEffect(() => {
    // Wait for auth context to finish loading from localStorage
    if (isLoading) return

    // Try to restore session from localStorage
    const hasAuth = checkAuth()

    if (!hasAuth || !isAuthenticated || !role) {
      navigate({
        to: "/login",
        replace: true,
      })
      return
    }

    // Redirect based on role
    navigate({
      to: role === "admin" ? "/admin" : "/staff",
      replace: true,
    })
  }, [isAuthenticated, role, isLoading, navigate, checkAuth])

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
        <p className="text-gray-300">Loading...</p>
      </div>
    </div>
  )
}