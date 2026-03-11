"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { backorderService } from "@/services/commercial/backorderService";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShoppingCart,
  Package,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

type Period = "7" | "30" | "90" | "ALL";

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function orderRevenue(order: SalesOrder): number {
  return order.lines.reduce((s, l) => s + l.quantity * (l.unitPrice || 0), 0);
}

function filterByPeriod(orders: SalesOrder[], period: Period): SalesOrder[] {
  if (period === "ALL") return orders;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(period));
  return orders.filter((o) => o.createdAt && new Date(o.createdAt) >= cutoff);
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(key: string): string {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("fr-TN", {
    month: "short",
    year: "2-digit",
  });
}

export default function CommercialReportsPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [backorderCount, setBackorderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("30");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [orderData, boData] = await Promise.all([
          salesOrderService.getAll(),
          backorderService.getAll(),
        ]);
        setOrders(orderData);
        setBackorderCount(boData.length);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => filterByPeriod(orders, period), [orders, period]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const delivered = filtered.filter((o) => o.status === "DELIVERED");
    const cancelled = filtered.filter((o) => o.status === "CANCELLED");
    const nonCancelled = filtered.filter((o) => o.status !== "CANCELLED");

    const revenue = nonCancelled.reduce((s, o) => s + orderRevenue(o), 0);
    const avgOrderValue = nonCancelled.length > 0 ? revenue / nonCancelled.length : 0;

    // On-time delivery rate
    const deliveredWithPromise = delivered.filter((o) => o.promisedDate && o.deliveredAt);
    const onTime = deliveredWithPromise.filter(
      (o) => new Date(o.deliveredAt!) <= new Date(o.promisedDate!)
    );
    const onTimeRate =
      deliveredWithPromise.length > 0
        ? Math.round((onTime.length / deliveredWithPromise.length) * 100)
        : null;

    // Avg delivery time (createdAt → deliveredAt)
    const deliveredWithBoth = delivered.filter((o) => o.createdAt && o.deliveredAt);
    const avgDeliveryDays =
      deliveredWithBoth.length > 0
        ? Math.round(
            deliveredWithBoth.reduce((s, o) => s + daysBetween(o.createdAt!, o.deliveredAt!), 0) /
              deliveredWithBoth.length
          )
        : null;

    // Cancellation rate
    const cancelRate = total > 0 ? Math.round((cancelled.length / total) * 100) : 0;

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const o of filtered) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }

    return {
      total,
      revenue,
      avgOrderValue,
      onTimeRate,
      avgDeliveryDays,
      cancelRate,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      byStatus,
    };
  }, [filtered]);

  // Revenue by month (last 6 months from ALL orders, not period-filtered)
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 5);
    cutoff.setDate(1);

    for (const o of orders) {
      if (!o.createdAt || o.status === "CANCELLED") continue;
      if (new Date(o.createdAt) < cutoff) continue;
      const key = getMonthKey(o.createdAt);
      map[key] = (map[key] || 0) + orderRevenue(o);
    }

    const keys = Object.keys(map).sort();
    const max = Math.max(...Object.values(map), 1);
    return keys.map((k) => ({ label: formatMonth(k), value: map[k], pct: (map[k] / max) * 100 }));
  }, [orders]);

  const periodOptions: { value: Period; label: string }[] = [
    { value: "7", label: "7 jours" },
    { value: "30", label: "30 jours" },
    { value: "90", label: "90 jours" },
    { value: "ALL", label: "Tout" },
  ];

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-400",
    CONFIRMED: "bg-blue-500",
    PREPARED: "bg-violet-500",
    SHIPPED: "bg-emerald-500",
    DELIVERED: "bg-teal-500",
    CANCELLED: "bg-rose-500",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: t("draft"),
    CONFIRMED: t("confirmedOrders"),
    PREPARED: t("prepared") || "Prepared",
    SHIPPED: t("shipped"),
    DELIVERED: t("delivered") || "Delivered",
    CANCELLED: t("cancelled"),
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("commercialModule")} · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <BarChart3 size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("reportsKpi") || "Reports & KPIs"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("reportsKpiSub") || "Logistics performance indicators"}
                </p>
              </div>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  period === opt.value
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-20 text-sm text-slate-500`}>
            <Loader2 size={16} className="animate-spin" /> {t("loading")}
          </div>
        ) : (
          <>
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {/* Revenue */}
              <div className={`${surface} p-5`}>
                <div className="inline-flex rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                  <TrendingUp size={16} />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("totalSalesRevenue")}
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {metrics.revenue.toLocaleString("fr-TN", { minimumFractionDigits: 0 })} TND
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {metrics.total} {t("totalOrdersKpi").toLowerCase()}
                </p>
              </div>

              {/* On-time delivery rate */}
              <div className={`${surface} p-5`}>
                <div className="inline-flex rounded-2xl bg-teal-50 p-2.5 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400">
                  <CheckCircle size={16} />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("onTimeRate") || "On-Time Delivery"}
                </p>
                <p className={`mt-1.5 text-2xl font-bold tracking-tight ${
                  metrics.onTimeRate === null
                    ? "text-slate-400"
                    : metrics.onTimeRate >= 80
                    ? "text-teal-700 dark:text-teal-400"
                    : metrics.onTimeRate >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {metrics.onTimeRate === null ? "—" : `${metrics.onTimeRate}%`}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {metrics.deliveredCount} {t("delivered") || "delivered"}
                </p>
              </div>

              {/* Avg delivery time */}
              <div className={`${surface} p-5`}>
                <div className="inline-flex rounded-2xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                  <Clock size={16} />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("avgDeliveryTime") || "Avg Delivery Time"}
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {metrics.avgDeliveryDays === null ? "—" : `${metrics.avgDeliveryDays}j`}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("avgDeliveryTimeSub") || "from order to delivery"}
                </p>
              </div>

              {/* Cancellation rate */}
              <div className={`${surface} p-5`}>
                <div className={`inline-flex rounded-2xl p-2.5 ${
                  metrics.cancelRate > 20
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  <XCircle size={16} />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("cancelRate") || "Cancellation Rate"}
                </p>
                <p className={`mt-1.5 text-2xl font-bold tracking-tight ${
                  metrics.cancelRate > 20 ? "text-rose-600 dark:text-rose-400" : "text-slate-950 dark:text-white"
                }`}>
                  {metrics.cancelRate}%
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {metrics.cancelledCount} {t("cancelled")}
                </p>
              </div>
            </div>

            {/* ── Secondary KPIs ── */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <div className={`${surface} px-6 py-5`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("avgOrderValue") || "Avg Order Value"}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {metrics.avgOrderValue.toLocaleString("fr-TN", { minimumFractionDigits: 0 })} TND
                </p>
              </div>
              <div className={`${surface} px-6 py-5`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("deliveredOrders") || "Delivered"}
                </p>
                <p className="mt-2 text-2xl font-bold text-teal-700 dark:text-teal-400">
                  {metrics.deliveredCount}
                </p>
              </div>
              <div className={`${surface} px-6 py-5`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("backorders") || "Backorders"}
                </p>
                <p className={`mt-2 text-2xl font-bold ${backorderCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-950 dark:text-white"}`}>
                  {backorderCount}
                </p>
              </div>
              <div className={`${surface} px-6 py-5`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {t("lateOrders") || "Late Orders"}
                </p>
                <p className={`mt-2 text-2xl font-bold ${
                  orders.filter(
                    (o) =>
                      o.promisedDate &&
                      ["DRAFT", "CONFIRMED", "PREPARED", "SHIPPED"].includes(o.status) &&
                      new Date(o.promisedDate) < new Date()
                  ).length > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-950 dark:text-white"
                }`}>
                  {orders.filter(
                    (o) =>
                      o.promisedDate &&
                      ["DRAFT", "CONFIRMED", "PREPARED", "SHIPPED"].includes(o.status) &&
                      new Date(o.promisedDate) < new Date()
                  ).length}
                </p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-5">
              {/* ── Revenue chart (last 6 months) ── */}
              <div className={`${surface} p-6 xl:col-span-3`}>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      {t("revenueByMonth") || "Revenue by Month"}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t("last6Months") || "Last 6 months (non-cancelled orders)"}
                    </p>
                  </div>
                  <BarChart3 size={16} className="text-slate-400" />
                </div>

                {revenueByMonth.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                    {t("noData") || "No data"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revenueByMonth.map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-right text-[11px] text-slate-500 dark:text-slate-400">
                          {m.label}
                        </span>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${m.pct}%` }}
                            />
                          </div>
                          <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                            {m.value.toLocaleString("fr-TN", { minimumFractionDigits: 0 })} TND
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Status breakdown ── */}
              <div className={`${surface} p-6 xl:col-span-2`}>
                <div className="mb-5">
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    {t("statusBreakdown") || "Status Breakdown"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {period === "ALL" ? t("allTime") || "All time" : `${t("last") || "Last"} ${period} ${t("days") || "days"}`}
                  </p>
                </div>

                {metrics.total === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                    {t("noData") || "No data"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(metrics.byStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 w-28 shrink-0">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColors[status] || "bg-slate-400"}`} />
                            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                              {statusLabels[status] || status}
                            </span>
                          </div>
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${statusColors[status] || "bg-slate-400"}`}
                                style={{ width: `${(count / metrics.total) * 100}%` }}
                              />
                            </div>
                            <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* On-time gauge */}
                {metrics.onTimeRate !== null && (
                  <div className="mt-6 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t("onTimeRate") || "On-Time Delivery"}
                      </p>
                      <p className={`text-sm font-bold ${
                        metrics.onTimeRate >= 80
                          ? "text-teal-600 dark:text-teal-400"
                          : metrics.onTimeRate >= 60
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {metrics.onTimeRate}%
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          metrics.onTimeRate >= 80
                            ? "bg-teal-500"
                            : metrics.onTimeRate >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${metrics.onTimeRate}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {t("onTimeRateSub") || "Orders delivered before promised date"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Alert summary ── */}
            {(metrics.onTimeRate !== null && metrics.onTimeRate < 60) ||
            metrics.cancelRate > 20 ||
            backorderCount > 0 ? (
              <div className={`${surface} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    {t("performanceAlerts") || "Performance Alerts"}
                  </h2>
                </div>
                <div className="space-y-2">
                  {metrics.onTimeRate !== null && metrics.onTimeRate < 60 && (
                    <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
                      <XCircle size={14} className="shrink-0" />
                      {t("alertOnTime") || `On-time delivery rate is low: ${metrics.onTimeRate}%`}
                    </div>
                  )}
                  {metrics.cancelRate > 20 && (
                    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                      <AlertTriangle size={14} className="shrink-0" />
                      {t("alertCancelRate") || `High cancellation rate: ${metrics.cancelRate}%`}
                    </div>
                  )}
                  {backorderCount > 0 && (
                    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                      <Package size={14} className="shrink-0" />
                      {`${backorderCount} backorder${backorderCount > 1 ? "s" : ""} pending`}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
