import { API_URL } from "@/config";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

const TOKEN_KEY = "postoken";
const ROLE_KEY = "posrole";
const USER_ID_KEY = "userId";
const INACTIVITY_TIMEOUT = 30000;

export function AuthGuard({
  children,
  allowedRoles,
  requireAuth = true,
}: AuthGuardProps) {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSetupAutoLogoutRef = useRef(false);
  const [authState] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    const userId = localStorage.getItem(USER_ID_KEY);

    if (requireAuth && (!token || !userId || !role)) {
      return {
        isAuthorized: false,
        redirectTo: "/login" as const,
        role: null as string | null,
      };
    }

    if (allowedRoles?.length && role && !allowedRoles.includes(role)) {
      const dest =
        role === "admin"
          ? "/admin"
          : role === "chef"
            ? "/chef"
            : ["staff", "cashier", "manager"].includes(role)
              ? "/staff"
              : "/login";
      return { isAuthorized: false, redirectTo: dest, role };
    }

    return { isAuthorized: true, redirectTo: null as string | null, role };
  });

  useEffect(() => {
    if (!authState.redirectTo) return;
    if (authState.redirectTo === "/login") {
      localStorage.clear();
    }
    navigate({ to: authState.redirectTo, replace: true });
  }, [authState.redirectTo, navigate]);

  useEffect(() => {
    if (!authState.isAuthorized || hasSetupAutoLogoutRef.current) return;

    const role = authState.role;
    if (!role || !["staff", "cashier", "manager"].includes(role)) return;

    hasSetupAutoLogoutRef.current = true;

    const logout = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (token) {
        fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }

      localStorage.clear();
      window.location.href = "/login";
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    };

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((e) =>
      document.addEventListener(e, resetTimer, { passive: true }),
    );
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((e) => document.removeEventListener(e, resetTimer));
    };
  }, [authState.isAuthorized, authState.role]);

  if (!authState.isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-gray-300">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
