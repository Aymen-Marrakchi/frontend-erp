"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { ArrowRight, ClipboardList, Truck } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function PurchaseDashboardPage() {
  const { t } = useLanguage();

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("purchaseModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Truck size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("purchaseDashboard")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("purchaseDashboardSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className={`${surface} p-8`}>
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
              <ClipboardList size={28} className="text-slate-500 dark:text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
              {t("purchaseDashboard")}
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t("purchaseDashboardPlaceholder")}
            </p>

            <Link
              href="/dashboard/achat/requests"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {t("openPurchaseRequests")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
