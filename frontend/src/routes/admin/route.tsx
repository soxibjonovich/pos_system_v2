import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Header } from '@/components/header'

export const Route = createFileRoute('/admin')({
    component: Layout,
})

function Layout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    )
}
