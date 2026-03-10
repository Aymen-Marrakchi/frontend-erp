"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  Lock,
  ShieldCheck,
  Bell,
  Moon,
  Trash2,
  ChevronRight,
  Settings,
} from "lucide-react";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t("systemLabel")}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Settings size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t("settingsTitle")}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Security */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Lock size={13} className="text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t("securitySection")}
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100 px-4 py-2 dark:divide-slate-800">
            <button className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <Lock size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t("changePassword")}
                </div>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {t("changePasswordDesc")}
                </div>
              </div>
              <ChevronRight
                size={15}
                className="flex-shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400"
              />
            </button>

            <button className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <ShieldCheck size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t("enableTwoFactor")}
                </div>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {t("twoFactorDesc")}
                </div>
              </div>
              <ChevronRight
                size={15}
                className="flex-shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400"
              />
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Settings size={13} className="text-slate-600 dark:text-slate-300" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t("preferencesSection")}
              </h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100 px-4 py-2 dark:divide-slate-800">
            <button className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <Bell size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t("enableNotifications")}
                </div>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {t("notificationsDesc")}
                </div>
              </div>
              <ChevronRight
                size={15}
                className="flex-shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400"
              />
            </button>

            <button className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <Moon size={15} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t("toggleDarkMode")}
                </div>
                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {t("darkModeDesc")}
                </div>
              </div>
              <ChevronRight
                size={15}
                className="flex-shrink-0 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400"
              />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-3xl border border-rose-200 bg-white shadow-sm md:col-span-2 dark:border-rose-900/30 dark:bg-slate-900">
          <div className="border-b border-rose-100 px-6 py-4 dark:border-rose-900/20">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40">
                <Trash2 size={13} className="text-rose-500" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500 dark:text-rose-400">
                {t("dangerZone")}
              </h2>
            </div>
          </div>

          <div className="px-4 py-2">
            <button className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition hover:bg-rose-50 dark:hover:bg-rose-950/20">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30">
                <Trash2 size={15} className="text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-rose-700 dark:text-rose-400">
                  {t("deleteAccount")}
                </div>
                <div className="mt-0.5 text-xs text-rose-400 dark:text-rose-500">
                  {t("deleteAccountDesc")}
                </div>
              </div>
              <ChevronRight
                size={15}
                className="flex-shrink-0 text-rose-300 transition group-hover:text-rose-500 dark:text-rose-800 dark:group-hover:text-rose-500"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
