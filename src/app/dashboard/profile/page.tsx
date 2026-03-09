"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const fields = [
    { label: t("fullName"), value: user?.name },
    { label: t("emailField"), value: user?.email },
    { label: t("roleField"), value: user?.role },
    ...(user?.role === "EMPLOYEE" && user?.department
      ? [{ label: "Department", value: user.department }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t("accountLabel")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t("myProfile")}
        </h1>
      </div>

      <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {t("profileInformation")}
        </h2>

        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {field.label}
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {field.value || "—"}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Contact your administrator to update your profile information.
        </p>
      </div>
    </div>
  );
}