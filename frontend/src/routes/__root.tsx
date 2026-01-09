import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"

const RootLayout = () => (
    <>
        <AuthProvider>
            <ThemeProvider>
                <Outlet />
            </ThemeProvider>
        </AuthProvider>
    </>
)

export const Route = createRootRoute({ component: RootLayout })