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
  Bell,
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
  PieChart,
  Pie,
  Cell,
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
  type: "PRODUIT_FINI" | "SOUS_ENSEMBLE" | "COMPOSANT" | "MATIERE_PREMIERE";
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
  const [showNotifications, setShowNotifications] = useState(false);

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  const tooltipStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(148,163,184,0.3)",
    borderRadius: "14px",
    fontSize: "12px",
    color: "#0f172a",
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

  const totalProducts = useMemo(
    () => products.filter((p) => p.status === "ACTIVE").length,
    [products]
  );

  const mpProductCount = useMemo(
    () => products.filter((p) => p.status === "ACTIVE" && p.type === "MATIERE_PREMIERE").length,
    [products]
  );

  const pfProductCount = useMemo(
    () => products.filter((p) => p.status === "ACTIVE" && p.type === "PRODUIT_FINI").length,
    [products]
  );

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
  const productTypeDistribution = useMemo(
    () => {
      const base = [
        { key: "PRODUIT_FINI" as const, label: "Produit fini", value: 0, color: "#0ea5e9" },
        { key: "SOUS_ENSEMBLE" as const, label: "Sous ensemble", value: 0, color: "#22c55e" },
        { key: "COMPOSANT" as const, label: "Composant", value: 0, color: "#a855f7" },
        {
          key: "MATIERE_PREMIERE" as const,
          label: "Matière première",
          value: 0,
          color: "#f97316",
        },
      ];

      const indexByKey = base.reduce<Record<string, number>>((acc, item, idx) => {
        acc[item.key] = idx;
        return acc;
      }, {});

      products.forEach((p) => {
        if (p.status === "ACTIVE" && indexByKey[p.type] !== undefined) {
          base[indexByKey[p.type]].value += 1;
        }
      });

      return base;
    },
    [products]
  );

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
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("stockModule")} · ERP
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t("dashboard")} <span className="text-slate-400 dark:text-slate-500">Stock</span>
            </h1>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <div className="relative">
                <Bell size={16} />
                {openAlerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {openAlerts.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] uppercase tracking-[0.16em]">
                {t("stockAlertsMenu")}
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {t("stockAlerts")}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {Math.min(openAlerts.length, 5)} / {openAlerts.length}
                  </span>
                </div>

                {latestAlerts.slice(0, 5).length === 0 ? (
                  <div className="py-4 text-center text-slate-500 dark:text-slate-400">
                    {t("noResults")}
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {latestAlerts.slice(0, 5).map((alert) => (
                      <li
                        key={alert._id}
                        className="rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-slate-900 dark:text-white">
                              {alert.productId?.sku || "—"} ·{" "}
                              {alert.productId?.name || t("product")}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                              {alert.message}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${alertBadge(
                              alert.type
                            )}`}
                          >
                            {alert.type}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
                  label: t("totalProducts"),
                  value: String(totalProducts),
                  sub: t("active"),
                },
                {
                  icon: <Package size={16} />,
                  iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
                  label: t("catalogValue"),
                  value: String(mpProductCount),
                  sub: t("active"),
                },
                {
                  icon: <AlertTriangle size={16} />,
                  iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
                  label: t("pfProductsValue"),
                  value: String(pfProductCount),
                  sub: t("active"),
                },
                {
                  icon: <ArrowDownToLine size={16} />,
                  iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
                  label: t("movements"),
                  value: String(movementsThisMonth),
                  sub: t("thisMonth"),
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
                      {t("stockLevels")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("stockVsMinimum")}
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
                    {t("stockAlerts")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("itemsNeedingAttention")}
                  </p>
                </div>

                <div className="space-y-3">
                  {latestAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      {t("noResults")}
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
                              {alert.productId?.name || t("product")}
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
                          <span>
                            {t("current")}: {alert.currentQuantity}
                          </span>
                          <span>
                            {t("minimum")}: {alert.thresholdQuantity ?? "—"}
                          </span>
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
                    {t("productCatalogTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("productTypes")}
                  </p>
                </div>

                {productTypeDistribution.every((item) => item.value === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {t("noProductsMatch")}
                  </div>
                ) : (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle as any} />
                        <Pie
                          data={productTypeDistribution}
                          dataKey="value"
                          nameKey="label"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          stroke="#020617"
                          strokeWidth={1}
                        >
                          {productTypeDistribution.map((entry, index) => (
                            <Cell key={`cell-${entry.key}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={`${surface} p-6`}>
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {t("stockProduction2")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("totalUnits")}
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: t("onHand"),
                      value: totalOnHand,
                      icon: <Package size={16} />,
                    },
                    {
                      label: t("reserved"),
                      value: totalReserved,
                      icon: <ArrowUpFromLine size={16} />,
                    },
                    {
                      label: t("availableQty"),
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
                    {t("lastSync")}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {t("products")}: {products.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {t("stockItems")}: {items.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {t("movements")}: {movements.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {t("stockAlertsMenu")}: {alerts.length}
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