"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Package,
  Truck,
  FileText,
  BarChart3,
  Users,
  AlertTriangle,
  Loader2,
  RotateCcw,
  CalendarDays,
  Sparkles,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const quickLinks = [
  {
    label: "Customers",
    desc: "Manage the commercial customer base.",
    href: "/dashboard/commercial/customers",
    icon: Users,
  },
  {
    label: "Orders",
    desc: "Create and follow the sales order tunnel.",
    href: "/dashboard/commercial/orders",
    icon: FileText,
  },
  {
    label: "Invoices",
    desc: "Configure customer invoices and finance handoff.",
    href: "/dashboard/commercial/invoices",
    icon: FileText,
  },
  {
    label: "Ordonnancement",
    desc: "Allocate stock before confirmation.",
    href: "/dashboard/commercial/ordonnancement",
    icon: Sparkles,
  },
  {
    label: "Preparation",
    desc: "Prepare confirmed orders before delivery planning.",
    href: "/dashboard/commercial/preparation",
    icon: Package,
  },
  {
    label: "Planning",
    desc: "Organize delivery planning after preparation is complete.",
    href: "/dashboard/commercial/planning",
    icon: CalendarDays,
  },
  {
    label: "Backorders",
    desc: "Track shortages still pending.",
    href: "/dashboard/commercial/backorders",
    icon: RotateCcw,
  },
  {
    label: "Reports",
    desc: "Monitor logistics KPIs and commercial performance.",
    href: "/dashboard/commercial/reports",
    icon: BarChart3,
  },
];

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
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message ===
            "string"
        ) {
          setError(
            (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
              "Failed to load commercial dashboard"
          );
        } else if (error instanceof Error) {
          setError(error.message || "Failed to load commercial dashboard");
        } else {
          setError("Failed to load commercial dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const draftOrders = orders.filter((o) => o.status === "DRAFT").length;
    const ordonnancedOrders = orders.filter((o) => o.status === "ORDONNANCED").length;
    const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED").length;
    const preparedOrders = orders.filter((o) => o.status === "PREPARED").length;
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
    const lateOrders = orders.filter(
      (o) =>
        o.promisedDate &&
        ["DRAFT", "ORDONNANCED", "CONFIRMED", "PREPARED", "SHIPPED"].includes(o.status) &&
        new Date(o.promisedDate) < new Date()
    ).length;

    return {
      totalOrders,
      draftOrders,
      ordonnancedOrders,
      confirmedOrders,
      preparedOrders,
      deliveredOrders,
      lateOrders,
    };
  }, [orders]);

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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: t("totalOrdersKpi"), value: metrics.totalOrders, icon: ShoppingCart, bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-300" },
                { label: t("draft"), value: metrics.draftOrders, icon: FileText, bg: "bg-amber-50 dark:bg-amber-950/30", color: "text-amber-600 dark:text-amber-400" },
                { label: "Ordonnanced", value: metrics.ordonnancedOrders, icon: Sparkles, bg: "bg-orange-50 dark:bg-orange-950/30", color: "text-orange-600 dark:text-orange-400" },
                { label: t("confirmedOrders"), value: metrics.confirmedOrders, icon: Package, bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-600 dark:text-blue-400" },
                { label: t("prepared") || "Prepared", value: metrics.preparedOrders, icon: Package, bg: "bg-violet-50 dark:bg-violet-950/30", color: "text-violet-600 dark:text-violet-400" },
                { label: t("delivered") || "Delivered", value: metrics.deliveredOrders, icon: Truck, bg: "bg-emerald-50 dark:bg-emerald-950/30", color: "text-emerald-600 dark:text-emerald-400" },
                { label: t("lateOrders") || "Late Orders", value: metrics.lateOrders, icon: AlertTriangle, bg: "bg-rose-50 dark:bg-rose-950/30", color: "text-rose-600 dark:text-rose-400" },
                { label: "Active Flow", value: metrics.draftOrders + metrics.ordonnancedOrders + metrics.confirmedOrders + metrics.preparedOrders, icon: BarChart3, bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-300" },
              ].map((kpi) => (
                <div key={kpi.label} className={`${surface} flex items-center gap-4 px-5 py-5`}>
                  <div className={`rounded-2xl p-3 ${kpi.bg}`}>
                    <kpi.icon size={16} className={kpi.color} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {kpi.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {kpi.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Commercial Navigation
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Open the commercial area you want to work on.
                </p>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-900">
                      <link.icon size={18} className="text-slate-600 dark:text-slate-300" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
                      {link.label}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {link.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
