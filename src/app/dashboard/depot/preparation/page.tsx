"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { salesOrderService, type SalesOrder } from "@/services/commercial/salesOrderService";
import { stockDepotService } from "@/services/stock/stockDepotService";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Package,
  Search,
  XCircle,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function DepotPreparationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [depotId, setDepotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const [data, depots] = await Promise.all([
        salesOrderService.getAll(),
        stockDepotService.getAll(),
      ]);
      setDepotId(depots.find((depot) => depot.managerId?._id === user?.id)?._id || null);
      setOrders(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load depot preparation orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const handlePrepare = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.prepare(id);
      await fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to mark order as prepared"));
    } finally {
      setActionId(null);
    }
  };

  const handleValidatePicking = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.validatePacking(id);
      await fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to validate picking"));
    } finally {
      setActionId(null);
    }
  };

  const depotOrders = useMemo(() => {
    if (!depotId) return [];
    return orders
      .filter((order) => ["ORDONNANCED", "PREPARED"].includes(order.status))
      .map((order) => ({
        ...order,
        lines: order.lines.filter((line) => line.depotId?._id === depotId),
      }))
      .filter((order) => order.lines.length > 0);
  }, [depotId, orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return depotOrders.filter(
      (order) =>
        order.orderNo.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q)
    );
  }, [depotOrders, search]);

  const totalUnits = useMemo(
    () =>
      filtered.reduce(
        (sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
        0
      ),
    [filtered]
  );

  return (
    <ProtectedRoute allowedRoles={["DEPOT_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Depot · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Package size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Preparation Orders
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Prepare your depot quantities, then print and validate picking from the same page.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <XCircle size={14} />
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Waiting Preparation",
              value: depotOrders.filter((order) =>
                order.lines.some((line) => !line.depotPreparedAt)
              ).length,
              color: "text-blue-700 dark:text-blue-400",
            },
            {
              label: "Ready To Validate",
              value: depotOrders.filter(
                (order) =>
                  order.status === "PREPARED" &&
                  !order.packingValidatedAt &&
                  !!order.pickingSlipPrintedAt
              ).length,
              color: "text-amber-700 dark:text-amber-400",
            },
            {
              label: "Units In Depot",
              value: totalUnits,
              color: "text-violet-700 dark:text-violet-400",
            },
          ].map((kpi) => (
            <div key={kpi.label} className={`${surface} px-6 py-5`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {kpi.label}
              </p>
              <p className={`mt-2 text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Depot orders
              <span className="ml-2 text-sm font-normal text-slate-400">{filtered.length}</span>
            </h2>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search depot orders"
                className="w-56 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> {t("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-400 dark:text-slate-500">
              <ClipboardCheck size={32} className="opacity-30" />
              {depotOrders.length === 0 ? "No orders assigned to your depot." : "No matching orders."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((order) => {
                const isExpanded = expandedId === order._id;
                const busy = actionId === order._id;
                const depotLinesPending = order.lines.some((line) => !line.depotPreparedAt);
                const canValidatePicking =
                  order.status === "PREPARED" &&
                  !order.packingValidatedAt &&
                  !!order.pickingSlipPrintedAt;

                return (
                  <div key={order._id}>
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {order.orderNo}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              order.status === "PREPARED"
                                ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {order.customerName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {order.lines.reduce((sum, line) => sum + line.quantity, 0)} units
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {depotLinesPending ? (
                          <button
                            onClick={() => handlePrepare(order._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <Package size={11} />}
                            Mark prepared
                          </button>
                        ) : canValidatePicking ? (
                          <button
                            onClick={() => handleValidatePicking(order._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            Validate picking
                          </button>
                        ) : order.status === "PREPARED" && !order.pickingSlipPrintedAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            Waiting document
                          </span>
                        ) : order.packingValidatedAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <CheckCircle2 size={11} />
                            Picking validated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Package size={11} />
                            Waiting other depots
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                              {["Product", t("quantity"), "Status"].map((header) => (
                                <th
                                  key={header}
                                  className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {order.lines.map((line, index) => (
                              <tr key={index}>
                                <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                                  {line.productId?.name || "—"}
                                </td>
                                <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                  {line.quantity}
                                </td>
                                <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                  {line.depotPreparedAt ? "Prepared" : "Pending"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
