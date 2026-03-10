"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Truck,
  FileText,
  ArrowRight,
  BarChart3,
  Users,
  Clock,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function CommercialDashboardPage() {
  const { t } = useLanguage();

  const kpis = [
    {
      label: t("totalOrdersKpi"),
      value: "—",
      sub: t("allOrdersList"),
      icon: <ShoppingCart size={16} />,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    },
    {
      label: t("draft"),
      value: "—",
      sub: t("pending"),
      icon: <Clock size={16} />,
      iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    },
    {
      label: t("confirmedOrders"),
      value: "—",
      sub: t("completed"),
      icon: <Package size={16} />,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    {
      label: t("shipped"),
      value: "—",
      sub: t("inTransit"),
      icon: <Truck size={16} />,
      iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
    },
  ];

  const quickLinks = [
    {
      label: t("commercialOrdersTitle"),
      desc: t("commercialOrdersSubtitle"),
      href: "/dashboard/commercial/orders",
      icon: <FileText size={18} className="text-blue-500" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("commercialModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <ShoppingCart size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("commercialDashboard")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("commercialDept")}
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpis.map((kpi, i) => (
            <div key={i} className={`${surface} p-5`}>
              <div className={`inline-flex rounded-2xl p-2.5 ${kpi.iconBg}`}>{kpi.icon}</div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {kpi.value}
              </p>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Revenue overview placeholder */}
          <div className={`${surface} p-6 xl:col-span-2`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {t("totalSalesRevenue")}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {t("monthlyPerf")}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <BarChart3 size={16} className="text-slate-500 dark:text-slate-400" />
              </div>
            </div>
            <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <TrendingUp size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">{t("comingSoon")}</p>
              </div>
            </div>
          </div>

          {/* Top customers placeholder */}
          <div className={`${surface} p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {t("customers")}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {t("newCustomers")}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Users size={16} className="text-slate-500 dark:text-slate-400" />
              </div>
            </div>
            <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">{t("comingSoon")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Recent activity placeholder */}
          <div className={`${surface} overflow-hidden xl:col-span-2`}>
            <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="font-semibold text-slate-950 dark:text-white">{t("recentActivity")}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {t("allOrdersList")}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center py-16">
              <ShoppingCart size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-400 dark:text-slate-500">{t("noRecentActivity")}</p>
              <Link
                href="/dashboard/commercial/orders"
                className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
              >
                {t("viewAll")} <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Quick access */}
          <div className={`${surface} p-6`}>
            <h2 className="mb-4 font-semibold text-slate-950 dark:text-white">{t("quickAccess")}</h2>
            <div className="space-y-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {link.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{link.label}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {link.desc}
                    </p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-slate-400" />
                </Link>
              ))}

              {/* Status overview */}
              <div className="mt-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("status")}
                </p>
                {[
                  { label: t("draft"), color: "bg-slate-400" },
                  { label: t("confirmedOrders"), color: "bg-blue-500" },
                  { label: t("shipped"), color: "bg-emerald-500" },
                  { label: t("cancelled"), color: "bg-rose-400" },
                ].map((item) => (
                  <div key={item.label} className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      {item.label}
                    </div>
                    <span className="text-slate-400">—</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
