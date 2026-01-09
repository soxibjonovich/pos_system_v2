import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate() as any;
  const { isAuthenticated, role } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate({
        to: role === "admin" ? "/admin" : "/staff",
        replace: true,
      });
    } else {
      navigate({
        to: "/login"
      })
    }
  }, [navigate, isAuthenticated, role]);
  
  return <></>
}
