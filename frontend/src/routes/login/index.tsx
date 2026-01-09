import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute('/login/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [username, setUsername] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(true);

  // TanStack Router navigate helper
  const navigate = useNavigate() as any;
  const { login, isAuthenticated, role } = useAuth();

  // 🌙 Dark mode by time
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🔁 Auto redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate({
        to: role === "admin" ? "/admin" : "/staff",
        replace: true,
      });
    }
  }, [navigate, isAuthenticated, role]);

  // 🔐 Login handler
  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8003/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError("Неверные учетные данные");
        return;
      }

      // ✅ Save auth data using context
      const token = data.token || data.access_token;
      const userInfo = {
        username: username,
        role: data.role,
        expiresAt: data.expires_at,
        tokenType: data.token_type || "bearer",
      };
      
      login(token, userInfo.role);

      // 🚀 Redirect by role
      if (data.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/staff" });
      }
    } catch (err) {
      console.error(err);
      setError("Ошибка сети. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinClick = (num: string) => {
    if (pin.length < 6) setPin((prev) => prev + num);
  };

  const handleClear = () => setPin("");
  const handleBackspace = () => setPin((prev) => prev.slice(0, -1));

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-8 ${
        isDark ? "bg-gray-900" : "bg-gray-100"
      }`}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1
            className={`text-3xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            POS System
          </h1>
          <h2
            className={`text-xl font-semibold ${
              isDark ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Вход в систему
          </h2>
        </div>

        <div
          className={`rounded-2xl shadow-2xl p-6 space-y-6 ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          {error && (
            <div
              className={`rounded-lg p-3 text-center font-semibold ${
                isDark
                  ? "bg-red-500/20 border border-red-500 text-red-300"
                  : "bg-red-100 border border-red-400 text-red-700"
              }`}
            >
              {error}
            </div>
          )}

          <div>
            <label
              className={`block font-semibold mb-2 ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full rounded-lg px-4 py-3 border ${
                isDark
                  ? "bg-gray-700 text-white border-gray-600"
                  : "bg-white text-gray-900 border-gray-300"
              }`}
              placeholder="Введите имя"
            />
          </div>

          <div>
            <label
              className={`block font-semibold mb-2 ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              PIN-код
            </label>
            <input
              type="password"
              readOnly
              value={pin}
              className={`w-full rounded-lg px-4 py-3 text-xl text-center tracking-widest font-bold border ${
                isDark
                  ? "bg-gray-700 text-white border-gray-600"
                  : "bg-white text-gray-900 border-gray-300"
              }`}
              placeholder="• • • • • •"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinClick(num.toString())}
                className="py-5 rounded-xl text-xl font-bold bg-gray-700 text-white"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="py-5 rounded-xl bg-red-600 text-white"
            >
              Очистить
            </button>
            <button
              onClick={() => handlePinClick("0")}
              className="py-5 rounded-xl bg-gray-700 text-white"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="py-5 rounded-xl bg-orange-600 text-white"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !username || !pin}
            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50"
          >
            {isLoading ? "Вход..." : "Войти в систему"}
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Версия 1.0.0 | © 2026 POS System
        </div>
      </div>
    </div>
  );
}
