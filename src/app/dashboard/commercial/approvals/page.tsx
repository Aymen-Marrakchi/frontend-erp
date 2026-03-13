"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  X,
  Clock,
  Zap,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function lineAmount(line: { quantity: number; unitPrice: number; discount?: number }) {
  const subtotal = line.quantity * line.unitPrice;
  return subtotal * (1 - Math.min(100, Math.max(0, line.discount || 0)) / 100);
}

export default function ApprovalsPage() {
  const { t } = useLanguage();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data: SalesOrder[] = await salesOrderService.getAll();
      setOrders(data.filter((o) => o.isUrgent && o.shipApproval?.status === "PENDING"));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.approveShip(id);
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to approve");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    try {
      setActionId(id);
      setError("");
      await salesOrderService.rejectShip(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason("");
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionId(null);
    }
  };

  const orderTotal = (order: SalesOrder) =>
    order.lines.reduce((sum, l) => sum + lineAmount(l), 0);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("commercialModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/30">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Approbations urgentes
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Commandes urgentes en attente d&apos;autorisation d&apos;expédition
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )}

        {/* KPI */}
        <div className={`${surface} px-6 py-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            En attente
          </p>
          <p className={`mt-2 text-3xl font-bold ${orders.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
            {loading ? "—" : orders.length}
          </p>
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              File d&apos;approbation
              <span className="ml-2 text-sm font-normal text-slate-400">{orders.length}</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> {t("loading")}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
              <ShieldCheck size={30} className="opacity-30" />
              Aucune approbation en attente
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((order) => {
                const busy = actionId === order._id;
                const total = orderTotal(order);
                const requestedAt = order.shipApproval?.requestedAt;

                return (
                  <div key={order._id} className="flex flex-wrap items-start gap-4 px-6 py-5">
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/commercial/orders/${order._id}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {order.orderNo}
                          <ExternalLink size={11} className="opacity-40" />
                        </Link>
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                          <Zap size={9} /> URGENT
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <Clock size={9} /> PENDING
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {order.customerName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                        {requestedAt && (
                          <span>Demandé le {new Date(requestedAt).toLocaleDateString("fr-TN")} à {new Date(requestedAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                        {order.promisedDate && (
                          <span>Promis: {new Date(order.promisedDate).toLocaleDateString("fr-TN")}</span>
                        )}
                        <span>{order.lines.length} ligne{order.lines.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => handleApprove(order._id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                        Approuver
                      </button>

                      {rejectingId === order._id ? (
                        <div className="space-y-1.5">
                          <input
                            autoFocus
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motif du rejet…"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-rose-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleReject(order._id)}
                              disabled={!rejectReason.trim() || busy}
                              className="flex-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRejectingId(order._id); setRejectReason(""); }}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                        >
                          <ShieldX size={13} /> Rejeter
                        </button>
                      )}
                    </div>
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
