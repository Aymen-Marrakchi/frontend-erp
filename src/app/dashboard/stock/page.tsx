"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Package,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stockProductService } from "@/services/stock/stockProductService";
import { stockItemService } from "@/services/stock/stockItemService";
import { stockMovementService } from "@/services/stock/stockMovementService";
import { stockAlertService } from "@/services/stock/stockAlertService";

interface Product {
  _id: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
  purchasePrice?: number;
}

interface StockItem {
  _id: string;
  productId: Product;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  status: "ACTIVE" | "INACTIVE";
  lastMovementAt?: string | null;
}

interface Movement {
  _id: string;
  productId?: Product;
  type: string;
  quantity: number;
  createdAt: string;
}

interface StockAlertItem {
  _id: string;
  productId?: Product;
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_RISK" | "SYSTEM";
  currentQuantity: number;
  thresholdQuantity?: number | null;
  status: "OPEN" | "ACKNOWLEDGED" | "CLOSED";
  createdAt: string;
  title: string;
  message: string;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-GB", { month: "short" });
}

export default function StockDashboardPage() {
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  const tooltipStyle = {
    backgroundColor: "#0f172a",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: "14px",
    fontSize: "12px",
    color: "#e2e8f0",
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [productData, itemData, movementData, alertData] = await Promise.all([
        stockProductService.getAll(),
        stockItemService.getAll(),
        stockMovementService.getAll(),
        stockAlertService.getAll(),
      ]);

      setProducts(productData);
      setItems(itemData);
      setMovements(movementData);
      setAlerts(alertData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load stock dashboard");
    } finally {
      setLoading(false);
    }
  };

  const totalSkus = useMemo(
    () => products.filter((p) => p.status === "ACTIVE").length,
    [products]
  );

  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = item.productId?.purchasePrice || 0;
      return sum + item.quantityOnHand * price;
    }, 0);
  }, [items]);

  const openAlerts = useMemo(
    () => alerts.filter((a) => a.status === "OPEN"),
    [alerts]
  );

  const movementsThisMonth = useMemo(() => {
    const now = new Date();
    return movements.filter((m) => {
      const d = new Date(m.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [movements]);

  const latestAlerts = useMemo(
    () =>
      [...openAlerts]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 7),
    [openAlerts]
  );

  const lowStockItems = useMemo(() => {
    return [...openAlerts]
      .filter((a) => a.type === "LOW_STOCK" || a.type === "OUT_OF_STOCK")
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 7);
  }, [openAlerts]);

  const movementChartData = useMemo(() => {
    const now = new Date();
    const months: { name: string; entry: number; exit: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: monthLabel(d),
        entry: 0,
        exit: 0,
      });
    }

    movements.forEach((m) => {
      const d = new Date(m.createdAt);
      const diff =
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());

      if (diff >= 0 && diff <= 5) {
        const idx = 5 - diff;
        if (m.type === "ENTRY") months[idx].entry += m.quantity;
        if (m.type === "EXIT" || m.type === "DEDUCTION") months[idx].exit += m.quantity;
      }
    });

    return months;
  }, [movements]);

  const totalOnHand = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0),
    [items]
  );

  const totalReserved = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantityReserved || 0), 0),
    [items]
  );

  const totalAvailable = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantityAvailable || 0), 0),
    [items]
  );

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const alertBadge = (type: StockAlertItem["type"]) => {
    if (type === "OUT_OF_STOCK") {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
    }
    if (type === "LOW_STOCK") {
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    }
    if (type === "NEGATIVE_RISK") {
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";
    }
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STOCK_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Stock Module · ERP
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t("dashboard")} <span className="text-slate-400 dark:text-slate-500">Stock</span>
            </h1>
          </div>
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Search size={16} className="opacity-0" />
            Loading dashboard...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: <Boxes size={16} />,
                  iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                  label: "Total SKUs",
                  value: String(totalSkus),
                  sub: "active products",
                },
                {
                  icon: <Package size={16} />,
                  iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
                  label: "Stock Value",
                  value: `${formatMoney(totalStockValue)} TND`,
                  sub: "current estimated value",
                },
                {
                  icon: <AlertTriangle size={16} />,
                  iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                  label: "Open Alerts",
                  value: String(openAlerts.length),
                  sub: "active stock alerts",
                },
                {
                  icon: <ArrowDownToLine size={16} />,
                  iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
                  label: "Movements This Month",
                  value: String(movementsThisMonth),
                  sub: "entries, exits and deductions",
                },
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`${surface} p-5`}
                >
                  <div className={`inline-flex rounded-2xl p-2.5 ${kpi.iconBg}`}>{kpi.icon}</div>

                  <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {kpi.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {kpi.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{kpi.sub}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className={`${surface} p-6 xl:col-span-2`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                      Stock Movement Chart
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Entries vs exits over the last 6 months
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={movementChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle as any} />
                    <Bar dataKey="entry" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="exit" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={`${surface} p-6`}>
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Latest Alerts
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Showing latest 7 open alerts
                  </p>
                </div>

                <div className="space-y-3">
                  {latestAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      No open alerts.
                    </div>
                  ) : (
                    latestAlerts.map((alert) => (
                      <div
                        key={alert._id}
                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950 dark:text-white">
                              {alert.productId?.name || "Unknown Product"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {alert.message}
                            </p>
                          </div>

                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${alertBadge(alert.type)}`}>
                            {alert.type}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Qty: {alert.currentQuantity}</span>
                          <span>Threshold: {alert.thresholdQuantity ?? "—"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className={`${surface} p-6 xl:col-span-2`}>
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Low Stock Products
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Products needing attention now
                  </p>
                </div>

                {lowStockItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    No low stock products.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          <th className="px-4 py-3 font-medium">{t("product")}</th>
                          <th className="px-4 py-3 font-medium">{t("sku")}</th>
                          <th className="px-4 py-3 font-medium">{t("current")}</th>
                          <th className="px-4 py-3 font-medium">{t("minimum")}</th>
                          <th className="px-4 py-3 font-medium">{t("status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {lowStockItems.map((alert) => (
                          <tr key={alert._id}>
                            <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">
                              {alert.productId?.name || "—"}
                            </td>
                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                              {alert.productId?.sku || "—"}
                            </td>
                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                              {alert.currentQuantity}
                            </td>
                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                              {alert.thresholdQuantity ?? "—"}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${alertBadge(alert.type)}`}>
                                {alert.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={`${surface} p-6`}>
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Stock Summary
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Global quantities
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "On Hand",
                      value: totalOnHand,
                      icon: <Package size={16} />,
                    },
                    {
                      label: "Reserved",
                      value: totalReserved,
                      icon: <ArrowUpFromLine size={16} />,
                    },
                    {
                      label: "Available",
                      value: totalAvailable,
                      icon: <ArrowDownToLine size={16} />,
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {row.icon}
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{row.label}</span>
                      </div>
                      <span className="text-lg font-semibold text-slate-950 dark:text-white">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Last refresh basis
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Products: {products.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Stock Items: {items.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Movements: {movements.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Alerts: {alerts.length}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Latest stock item activity:{" "}
                    {items.length > 0
                      ? formatDateTime(
                          [...items]
                            .sort(
                              (a, b) =>
                                +new Date(b.lastMovementAt || 0) - +new Date(a.lastMovementAt || 0)
                            )[0]?.lastMovementAt
                        )
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}