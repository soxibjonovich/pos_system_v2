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
    const redirectUser = async () => {
      if (isLoading) return

      const hasAuth = checkAuth()

      let target = "/login"

      if (hasAuth && isAuthenticated && role) {
        target = role === "admin" ? "/admin" : "/staff"
      }

      navigate({ to: target, replace: true })
    }

    redirectUser()
  }, [isAuthenticated, role, isLoading, navigate, checkAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
        <p className="text-gray-300">Loading...</p>
      </div>
    </div>
  )
}
