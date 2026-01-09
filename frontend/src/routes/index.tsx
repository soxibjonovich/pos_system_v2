import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export const Route = createFileRoute("/")({
  component: IndexRoute,
})

function IndexRoute() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !role) {
      navigate({
        to: "/login",
        replace: true,
      })
      return
    }

    navigate({
      to: role === "admin" ? "/admin" : "/staff",
      replace: true,
    })
  }, [isAuthenticated, role, navigate])

  return null
}
