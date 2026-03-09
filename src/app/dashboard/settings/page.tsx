"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t("systemLabel")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t("settingsTitle")}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {t("securitySection")}
          </h2>

          <div className="space-y-3">
            <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              {t("changePassword")}
            </button>

            <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              {t("enableTwoFactor")}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {t("preferencesSection")}
          </h2>

          <div className="space-y-3">
            <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              {t("enableNotifications")}
            </button>

            <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              {t("toggleDarkMode")}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm md:col-span-2 dark:border-rose-900/30 dark:bg-slate-900">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500 dark:text-rose-400">
            {t("dangerZone")}
          </h2>

          <button className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/30">
            {t("deleteAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}