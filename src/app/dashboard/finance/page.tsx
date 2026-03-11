"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  ArrowRight,
  BarChart3,
  Clock,
  Loader2,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function FinanceDashboardPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await salesOrderService.getAll();
        setOrders(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load finance dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = useMemo(() => {
    const calcTotal = (list: SalesOrder[]) =>
      list.reduce(
        (sum, order) =>
          sum +
          order.lines.reduce(
            (lineSum, line) => lineSum + line.quantity * (line.unitPrice || 0),
            0
          ),
        0
      );

    const draftOrders = orders.filter((o) => o.status === "DRAFT");
    const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED");
    const preparedOrders = orders.filter((o) => o.status === "PREPARED");
    const shippedOrders = orders.filter((o) => o.status === "SHIPPED");
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

    const totalSalesValue = calcTotal(
      orders.filter((o) => o.status !== "CANCELLED")
    );
    const receivablesValue = calcTotal(
      [...shippedOrders, ...deliveredOrders]
    );
    const pipelineValue = calcTotal(
      [...draftOrders, ...confirmedOrders, ...preparedOrders]
    );
    const cancelledValue = calcTotal(cancelledOrders);

    const recentOrders = [...orders]
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    return {
      totalSalesValue,
      receivablesValue,
      pipelineValue,
      cancelledValue,
      draftCount: draftOrders.length,
      confirmedCount: confirmedOrders.length,
      preparedCount: preparedOrders.length,
      shippedCount: shippedOrders.length,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      recentOrders,
    };
  }, [orders]);

  const kpis = [
    {
      label: "Total Sales Value",
      value: `${metrics.totalSalesValue.toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
      })} TND`,
      sub: "non-cancelled orders",
      icon: <DollarSign size={16} />,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    {
      label: "Receivables",
      value: `${metrics.receivablesValue.toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
      })} TND`,
      sub: "shipped + delivered",
      icon: <Wallet size={16} />,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    },
    {
      label: "Pipeline Value",
      value: `${metrics.pipelineValue.toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
      })} TND`,
      sub: "draft + confirmed + prepared",
      icon: <TrendingUp size={16} />,
      iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
    },
    {
      label: "Cancelled Value",
      value: `${metrics.cancelledValue.toLocaleString("fr-TN", {
        minimumFractionDigits: 2,
      })} TND`,
      sub: "lost order value",
      icon: <TrendingDown size={16} />,
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
    },
  ];

  const quickLinks = [
    {
      label: "Receivables",
      desc: "Follow customer-side receivable amounts",
      href: "/dashboard/finance/receivables",
      icon: <FileText size={18} className="text-blue-500" />,
    },
    {
      label: "Treasury",
      desc: "See cash and expected inflow/outflow",
      href: "/dashboard/finance/treasury",
      icon: <Wallet size={18} className="text-emerald-500" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("financeModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <DollarSign size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("financeModule")} Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Financial overview based on commercial order activity
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

            <div className="grid gap-6 xl:grid-cols-3">
              <div className={`${surface} p-6 xl:col-span-2`}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Status Overview
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Financial visibility by commercial status
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <BarChart3 size={16} className="text-slate-500 dark:text-slate-400" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Draft", value: metrics.draftCount },
                    { label: "Confirmed", value: metrics.confirmedCount },
                    { label: "Prepared", value: metrics.preparedCount },
                    { label: "Shipped", value: metrics.shippedCount },
                    { label: "Delivered", value: metrics.deliveredCount },
                    { label: "Cancelled", value: metrics.cancelledCount },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800"
                    >
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${surface} p-6`}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Collection Focus
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      Receivable-oriented snapshot
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Clock size={16} className="text-slate-500 dark:text-slate-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Shipped Orders</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      {metrics.shippedCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Delivered Orders</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      {metrics.deliveredCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Receivables Value</p>
                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      {metrics.receivablesValue.toLocaleString("fr-TN", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      TND
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className={`${surface} overflow-hidden xl:col-span-2`}>
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <h2 className="font-semibold text-slate-950 dark:text-white">Recent Commercial Orders</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Latest activity affecting finance visibility
                  </p>
                </div>

                {metrics.recentOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">No recent orders</p>
                    <Link
                      href="/dashboard/commercial/orders"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
                    >
                      {t("viewAll")} <ArrowRight size={12} />
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics.recentOrders.map((order) => {
                      const total = order.lines.reduce(
                        (sum, line) => sum + line.quantity * (line.unitPrice || 0),
                        0
                      );

                      return (
                        <Link
                          key={order._id}
                          href={`/dashboard/commercial/orders/${order._id}`}
                          className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {order.orderNo}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                              {order.customerName}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {total.toLocaleString("fr-TN", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              TND
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{order.status}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

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
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}