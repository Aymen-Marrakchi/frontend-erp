"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import { Loader2, Search, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { stockAlertService } from "@/services/stock/stockAlertService";

interface Product {
  _id: string;
  sku: string;
  name: string;
  category?: string;
}

interface StockAlert {
  _id: string;
  productId: Product;
  thresholdRuleId?: {
    _id: string;
    minQuantity?: number;
  } | null;
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE_RISK" | "SYSTEM";
  title: string;
  message: string;
  currentQuantity: number;
  thresholdQuantity?: number | null;
  status: "OPEN" | "ACKNOWLEDGED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

export default function StockAlertsPage() {
  const { t } = useLanguage();

  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "ACKNOWLEDGED" | "CLOSED">(
    "ALL"
  );
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await stockAlertService.getAll();
      setAlerts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alerts.filter((alert) => {
      const matchSearch =
        alert.productId?.name?.toLowerCase().includes(q) ||
        alert.productId?.sku?.toLowerCase().includes(q) ||
        alert.type.toLowerCase().includes(q) ||
        alert.title.toLowerCase().includes(q) ||
        alert.message.toLowerCase().includes(q);

      const matchStatus = statusFilter === "ALL" ? true : alert.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [alerts, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: alerts.length,
      open: alerts.filter((a) => a.status === "OPEN").length,
      acknowledged: alerts.filter((a) => a.status === "ACKNOWLEDGED").length,
      closed: alerts.filter((a) => a.status === "CLOSED").length,
    }),
    [alerts]
  );

  const updateStatus = async (id: string, status: "OPEN" | "ACKNOWLEDGED" | "CLOSED") => {
    try {
      setUpdatingId(id);
      await stockAlertService.updateStatus(id, status);
      await fetchAlerts();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update alert");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const typeBadge = (type: StockAlert["type"]) => {
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

  const statusBadge = (status: StockAlert["status"]) => {
    if (status === "OPEN") {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
    }
    if (status === "ACKNOWLEDGED") {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    }
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
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
              {t("stockAlertsMenu")}{" "}
              <span className="text-slate-400 dark:text-slate-500">Monitoring</span>
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: t("stockAlertsMenu"), value: String(stats.total), sub: "total alerts" },
            { label: "Open", value: String(stats.open), sub: "requires action" },
            {
              label: "Acknowledged",
              value: String(stats.acknowledged),
              sub: "under review",
            },
            { label: "Closed", value: String(stats.closed), sub: "resolved alerts" },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${surface} flex items-center gap-4 px-5 py-5`}
            >
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <TriangleAlert size={16} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {t("stockAlertsMenu")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} {t("ofText")} {alerts.length} {t("records")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                  placeholder={t("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "ALL" | "OPEN" | "ACKNOWLEDGED" | "CLOSED"
                  )
                }
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">OPEN</option>
                <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-sm text-rose-600 dark:text-rose-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("noResults")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">{t("product")}</th>
                    <th className="px-6 py-3 font-medium">{t("sku")}</th>
                    <th className="px-6 py-3 font-medium">{t("type")}</th>
                    <th className="px-6 py-3 font-medium">{t("current")}</th>
                    <th className="px-6 py-3 font-medium">{t("minimum")}</th>
                    <th className="px-6 py-3 font-medium">{t("status")}</th>
                    <th className="px-6 py-3 font-medium">{t("date")}</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((alert, i) => (
                    <motion.tr
                      key={alert._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {alert.productId?.name || "—"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {alert.message}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {alert.productId?.sku || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeBadge(alert.type)}`}>
                          {alert.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {alert.currentQuantity}
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {alert.thresholdQuantity ?? alert.thresholdRuleId?.minQuantity ?? "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(alert.status)}`}>
                          {alert.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {formatDateTime(alert.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {alert.status === "OPEN" && (
                            <button
                              onClick={() => updateStatus(alert._id, "ACKNOWLEDGED")}
                              disabled={updatingId === alert._id}
                              className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-950/20"
                            >
                              {updatingId === alert._id ? "..." : "Acknowledge"}
                            </button>
                          )}

                          {alert.status !== "CLOSED" && (
                            <button
                              onClick={() => updateStatus(alert._id, "CLOSED")}
                              disabled={updatingId === alert._id}
                              className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                            >
                              {updatingId === alert._id ? "..." : "Close"}
                            </button>
                          )}

                          {alert.status !== "OPEN" && (
                            <button
                              onClick={() => updateStatus(alert._id, "OPEN")}
                              disabled={updatingId === alert._id}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              {updatingId === alert._id ? "..." : "Reopen"}
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}