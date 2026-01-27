// src/components/header.tsx
import React from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useLocation, Link, useNavigate } from '@tanstack/react-router'
import { ModeToggle } from "./mode-toggle"
import { Button } from "./ui/button"
import { LogOut, SettingsIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { API_URL } from '@/config'

export function Header() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { token, logout } = useAuth()
    const [isLoggingOut, setIsLoggingOut] = React.useState(false)

    type PathItem = {
        path: string;
        title: string;
    };

    const createPathData = (path: string): PathItem[] => {
        const parts = path.split("/").filter(Boolean);
        return parts.map((part, index) => {
            const fullPath = "/" + parts.slice(0, index + 1).join("/");
            return {
                path: fullPath,
                title: part.charAt(0).toUpperCase() + part.slice(1),
            };
        });
    };

    const formatTitle = (s: string) =>
        s
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const handleLogout = async () => {
        setIsLoggingOut(true)
        
        try {
            if (token) {
                await fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }).catch(err => console.error('Logout API error:', err))
            }
        } finally {
            logout()
            navigate({ to: '/login', replace: true })
            setIsLoggingOut(false)
        }
    }

    const createdPathData = createPathData(String(pathname));
    const indexesToRemove: number[] = [0];
    const filteredPathData = createdPathData.filter((_, index) => !indexesToRemove.includes(index));

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b justify-between px-3">
            <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        {filteredPathData.length === 0 ? null : filteredPathData.map((item, index) => {
                            return (
                                <React.Fragment key={`${item.path}-${index}`}>
                                    {index !== 0 && <BreadcrumbSeparator className="hidden md:block" />}
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href={item.path}>
                                            {formatTitle(item.title)}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                </React.Fragment>
                            )
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex items-center gap-2">
                {createdPathData.length > 0 && (
                    <Link to={createdPathData[0].path + "/settings"}>
                        <Button variant="outline" size="icon">
                            <SettingsIcon className="size-4" />
                        </Button>
                    </Link>
                )}
                <ModeToggle />
                <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    title="Logout"
                >
                    <LogOut className={`size-4 ${isLoggingOut ? "animate-spin" : ""}`} />
                </Button>
            </div>
        </header>
    )
}