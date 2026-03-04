import { api, API_URL } from "@/config";
import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher, useI18n } from "@/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

const PIN_MIN = 4;
const PIN_MAX = 6;
const TOKEN_KEY = "postoken";
const ROLE_KEY = "posrole";
const USER_ID_KEY = "userId";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});

interface LoginResponse {
  access_token: string;
  role: string;
  user_id: number;
}

const getRoleRoute = (role: string) => {
  if (role === "admin") return "/admin";
  if (role === "chef") return "/chef";
  return "/staff";
};

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, role } = useAuth();
  const { t } = useI18n();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const isPinValid = pin.length >= PIN_MIN && pin.length <= PIN_MAX;

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedRole = localStorage.getItem(ROLE_KEY);
    const userId = localStorage.getItem(USER_ID_KEY);

    if (token && savedRole && userId) {
      login(token, savedRole, userId);
      navigate({ to: getRoleRoute(savedRole), replace: true });
    }
  }, [login, navigate]);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsDark(hour < 6 || hour >= 18);

    const timer = setInterval(() => {
      const h = new Date().getHours();
      setIsDark(h < 6 || h >= 18);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate({ to: getRoleRoute(role), replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const addDigit = useCallback((d: string) => {
    setPin((prev) => (prev.length < PIN_MAX ? prev + d : prev));
  }, []);

  const clearPin = useCallback(() => setPin(""), []);
  const backspace = useCallback(() => setPin((prev) => prev.slice(0, -1)), []);

  const handleLogin = useCallback(async () => {
    if (!isPinValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/${api.auth.base}/${api.auth.login}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: parseInt(pin, 10) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || t("auth.invalidPin"));
        setPin("");
        setIsLoading(false);
        return;
      }

      const data: LoginResponse = await res.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(ROLE_KEY, data.role);
      localStorage.setItem(USER_ID_KEY, String(data.user_id));

      login(data.access_token, data.role, String(data.user_id));
      navigate({ to: getRoleRoute(data.role), replace: true });
    } catch {
      setError("Network error");
      setPin("");
      setIsLoading(false);
    }
  }, [isPinValid, isLoading, pin, t, login, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isPinValid) handleLogin();
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clearPin();
      else if (/^[0-9]$/.test(e.key)) addDigit(e.key);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPinValid, handleLogin, backspace, clearPin, addDigit]);

  const bg = isDark ? "bg-gray-900" : "bg-gray-100";
  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const text = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-gray-300" : "text-gray-600";

  return (
    <div
      className={`h-[100dvh] w-full flex items-center justify-center p-3 sm:p-4 overflow-hidden ${bg}`}
    >
      {error && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setError("")}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-red-600 text-center mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-lg font-semibold">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md min-w-0">
        <header className="text-center mb-4">
          <LanguageSwitcher dark={isDark} />
          <h1 className={`text-3xl font-bold ${text}`}>{t("common.pos")}</h1>
          <p className={`text-base mt-2 ${textSub}`}>PIN orqali kiring</p>
        </header>

        <div
          className={`rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 ${cardBg}`}
        >
          <div
            className={`max-w-md mx-auto w-full grid gap-2 p-3 border-2 border-dashed rounded-xl text-xl text-center font-mono ${
              isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
            }`}
            style={{ gridTemplateColumns: `repeat(${PIN_MAX}, 1fr)` }}
          >
            {Array.from({ length: PIN_MAX }, (_, i) => (
              <span key={i}>{pin[i] ? "●" : "•"}</span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => addDigit(String(n))}
                className="py-3.5 rounded-xl text-xl bg-gray-700 text-white hover:bg-gray-600 transition"
              >
                {n}
              </button>
            ))}
            <button
              onClick={clearPin}
              disabled={!pin.length}
              className="py-3.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              {t("common.clear")}
            </button>
            <button
              onClick={() => addDigit("0")}
              className="py-3.5 rounded-xl text-xl bg-gray-700 text-white hover:bg-gray-600 transition"
            >
              0
            </button>
            <button
              onClick={backspace}
              disabled={!pin.length}
              className="py-3.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xl"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={!isPinValid || isLoading}
            className="w-full py-4 rounded-xl bg-indigo-600 text-white text-base font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </div>
      </div>
    </div>
  );
}
