"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Truck,
  FileText,
  ArrowRight,
  BarChart3,
  Users,
  AlertTriangle,
  Loader2,
  RotateCcw,
  CalendarDays,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function CommercialDashboardPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await salesOrderService.getAll();
        setOrders(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load commercial dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const draftOrders = orders.filter((o) => o.status === "DRAFT").length;
    const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED").length;
    const preparedOrders = orders.filter((o) => o.status === "PREPARED").length;
    const shippedOrders = orders.filter((o) => o.status === "SHIPPED").length;
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;

    const totalRevenue = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce(
        (sum, order) =>
          sum +
          order.lines.reduce(
            (lineSum, line) => lineSum + line.quantity * (line.unitPrice || 0),
            0
          ),
        0
      );

    const lateOrders = orders.filter(
      (o) =>
        o.promisedDate &&
        ["DRAFT", "CONFIRMED", "PREPARED", "SHIPPED"].includes(o.status) &&
        new Date(o.promisedDate) < new Date()
    ).length;

    const recentOrders = [...orders]
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    return {
      totalOrders,
      draftOrders,
      confirmedOrders,
      preparedOrders,
      shippedOrders,
      cancelledOrders,
      deliveredOrders,
      totalRevenue,
      recentOrders,
      lateOrders,
    };
  }, [orders]);

  const kpis = [
    {
      label: t("totalOrdersKpi"),
      value: metrics.totalOrders,
      sub: t("allOrdersList"),
      icon: <ShoppingCart size={16} />,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    },
    {
      label: t("confirmedOrders"),
      value: metrics.confirmedOrders,
      sub: t("prepared") || "Ready for preparation",
      icon: <Package size={16} />,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    {
      label: t("shipped"),
      value: metrics.shippedOrders,
      sub: t("inTransit"),
      icon: <Truck size={16} />,
      iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
    },
    {
      label: t("lateOrders") || "Late Orders",
      value: metrics.lateOrders,
      sub: t("lateOrdersSub") || "Past promised date",
      icon: <AlertTriangle size={16} />,
      iconBg: metrics.lateOrders > 0
        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
    },
  ];

  const quickLinks = [
    {
      label: t("customersTitle") || "Customers",
      desc: t("customersSub") || "Manage your customer database",
      href: "/dashboard/commercial/customers",
      icon: <Users size={18} className="text-sky-500" />,
    },
    {
      label: t("commercialOrdersTitle"),
      desc: t("commercialOrdersSubtitle"),
      href: "/dashboard/commercial/orders",
      icon: <FileText size={18} className="text-blue-500" />,
    },
    {
      label: t("prepared") || "Preparation",
      desc: "Manage confirmed orders before shipment",
      href: "/dashboard/commercial/preparation",
      icon: <Package size={18} className="text-violet-500" />,
    },
    {
      label: t("shipped") || "Shipments",
      desc: "Ship prepared orders and confirm delivery",
      href: "/dashboard/commercial/shipments",
      icon: <Truck size={18} className="text-emerald-500" />,
    },
    {
      label: t("carriersTitle") || "Carriers",
      desc: t("carriersSub") || "Manage shipping carriers and rate configuration",
      href: "/dashboard/commercial/carriers",
      icon: <Truck size={18} className="text-teal-500" />,
    },
    {
      label: t("deliveryPlanning") || "Delivery Planning",
      desc: t("deliveryPlanningSub") || "Schedule and group shipments for delivery runs",
      href: "/dashboard/commercial/planning",
      icon: <CalendarDays size={18} className="text-indigo-500" />,
    },
    {
      label: t("backorders") || "Backorders",
      desc: "Orders with insufficient stock at confirmation",
      href: "/dashboard/commercial/backorders",
      icon: <RotateCcw size={18} className="text-amber-500" />,
    },
    {
      label: t("reportsKpi") || "Reports & KPIs",
      desc: "Logistics performance and analytics",
      href: "/dashboard/commercial/reports",
      icon: <BarChart3 size={18} className="text-blue-500" />,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
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

            <div className="grid gap-6 xl:grid-cols-3">
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
                <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <TrendingUp size={32} className="mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {metrics.totalRevenue.toLocaleString("fr-TN", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    TND
                  </p>
                  <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                    {metrics.deliveredOrders} delivered · {metrics.cancelledOrders} cancelled
                  </p>
                </div>
              </div>

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

            <div className="grid gap-6 xl:grid-cols-3">
              <div className={`${surface} overflow-hidden xl:col-span-2`}>
                <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <h2 className="font-semibold text-slate-950 dark:text-white">{t("recentActivity")}</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {t("allOrdersList")}
                  </p>
                </div>

                {metrics.recentOrders.length === 0 ? (
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

                  <div className="mt-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {t("status")}
                    </p>
                    {[
                      { label: t("draft"), color: "bg-slate-400", value: metrics.draftOrders },
                      { label: t("confirmedOrders"), color: "bg-blue-500", value: metrics.confirmedOrders },
                      { label: t("prepared") || "Prepared", color: "bg-violet-500", value: metrics.preparedOrders },
                      { label: t("shipped"), color: "bg-emerald-500", value: metrics.shippedOrders },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${item.color}`} />
                          {item.label}
                        </div>
                        <span className="text-slate-400">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}