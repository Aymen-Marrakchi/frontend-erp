"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authservice";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
        <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8- .36.98-.86 1.89-1.46 2.7" />
        <path d="M6.1 6.1A11.06 11.06 0 0 0 1 12c1.73 4.89 6 8 11 8a10.9 10.9 0 0 0 5.9-1.7" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.46 12C4.2 7.64 7.8 5 12 5s7.8 2.64 9.54 7c-1.74 4.36-5.34 7-9.54 7s-7.8-2.64-9.54-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleRoutes = useMemo<Record<string, string>>(
  () => ({
    ADMIN: "/dashboard/admin",
    HR_MANAGER: "/dashboard/hr",
    MARKETING_MANAGER: "/dashboard/marketing",
    SALES_MANAGER: "/dashboard/sales",
    STOCK_MANAGER: "/dashboard/stock",
    DEPOT_MANAGER: "/dashboard/depot",
    COMMERCIAL_MANAGER: "/dashboard/commercial",
    FINANCE_MANAGER: "/dashboard/finance",
    PURCHASE_MANAGER: "/dashboard/achat",
    EMPLOYEE: "/dashboard/employee",
  }),
  []
);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.login({ email, password });

      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        token: data.token,
      });

      router.push(roleRoutes[data.user.role] || "/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT PANEL */}
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-50 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950">
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-slate-200/70 blur-3xl dark:bg-slate-800/60" />
          <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-slate-300/30 blur-3xl dark:bg-slate-700/20" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                {t("erpSubtitle")}
              </div>

              <div className="mt-8 max-w-xl">
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 xl:text-5xl dark:text-white">
                  ERP<span className="text-slate-400 dark:text-slate-500">.</span>
                </h1>
                <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-400">
                  {t("erpTagline")}
                </p>
              </div>
            </div>

            <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: t("statRevenue"), value: "$218,400" },
                { label: t("statOrders"), value: "1,646" },
                { label: t("statUptime"), value: "99.98%" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </div>
                  <div className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("authLabel")}
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("signInTitle")}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Access your workspace securely and continue managing your ERP operations.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    {t("emailLabel")}
                  </label>
                  <input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    {t("passwordLabel")}
                  </label>

                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <EyeIcon open={showPwd} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Forgot password?
                  </button>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {loading ? "Signing in..." : t("signInButton")}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-xs tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {t("copyright")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}