"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Send,
  ShieldCheck,
  ShieldX,
  ShoppingCart,
  Truck,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  PREPARED: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  DELIVERED: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  CLOSED: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function lineAmount(line: { quantity: number; unitPrice: number; discount?: number }) {
  const subtotal = line.quantity * (line.unitPrice || 0);
  return subtotal * (1 - Math.min(100, Math.max(0, line.discount || 0)) / 100);
}

function isLate(order: SalesOrder): boolean {
  if (!order.promisedDate) return false;
  if (["DELIVERED", "CLOSED", "CANCELLED"].includes(order.status)) return false;
  return new Date(order.promisedDate) < new Date();
}

export default function CommercialOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const isManager = user?.role === "ADMIN" || user?.role === "COMMERCIAL_MANAGER";

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rejectingApproval, setRejectingApproval] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await salesOrderService.getById(params.id);
      setOrder(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchOrder();
  }, [params.id]);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce((sum, line) => sum + lineAmount(line), 0);
  }, [order]);

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      setActionId("busy");
      setError("");
      await fn();
      await fetchOrder();
    } catch (err: any) {
      setError(err.response?.data?.message || "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const busy = actionId === "busy";

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <ShoppingCart size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Commercial · ERP
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Order Details
            </h1>
          </div>
        </div>

        <Link
          href="/dashboard/commercial/orders"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={14} /> Back to orders
        </Link>

        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500`}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : !order ? (
          <div className={`${surface} px-6 py-12 text-sm text-slate-500`}>Order not found.</div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Main info card */}
              <div className={`${surface} p-6 xl:col-span-2`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Order No
                    </p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {order.orderNo}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {order.customerName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status] ?? statusColors.DRAFT}`}>
                      {order.status}
                    </span>
                    {order.isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                        <Zap size={11} /> URGENT
                      </span>
                    )}
                    {isLate(order) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        <Clock size={11} /> Late
                      </span>
                    )}
                    {order.isUrgent && order.shipApproval?.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        <Clock size={11} /> Awaiting Approval
                      </span>
                    )}
                    {order.isUrgent && order.shipApproval?.status === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <ShieldCheck size={11} /> Ship Approved
                      </span>
                    )}
                    {order.isUrgent && order.shipApproval?.status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        <ShieldX size={11} /> Approval Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  {order.createdAt && <span>Créé: {new Date(order.createdAt).toLocaleDateString("fr-TN")}</span>}
                  {order.promisedDate && (
                    <span className={isLate(order) ? "text-rose-500 dark:text-rose-400" : ""}>
                      Promis: {new Date(order.promisedDate).toLocaleDateString("fr-TN")}
                    </span>
                  )}
                  {order.preparedAt && <span>Préparé: {new Date(order.preparedAt).toLocaleDateString("fr-TN")}</span>}
                  {order.shippedAt && <span>Expédié: {new Date(order.shippedAt).toLocaleDateString("fr-TN")}</span>}
                  {order.deliveredAt && <span>Livré: {new Date(order.deliveredAt).toLocaleDateString("fr-TN")}</span>}
                  {order.closedAt && <span>Clôturé: {new Date(order.closedAt).toLocaleDateString("fr-TN")}</span>}
                  {order.vehicleId?.matricule && <span>Car: {order.vehicleId.matricule}</span>}
                  {!order.vehicleId?.matricule && order.trackingNumber && <span>Tracking: {order.trackingNumber}</span>}
                </div>

                {order.isUrgent && order.shipApproval?.status === "REJECTED" && order.shipApproval.rejectionReason && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                    Motif rejet: {order.shipApproval.rejectionReason}
                  </div>
                )}

                {order.notes && (
                  <div className="mt-4 rounded-2xl border border-slate-100 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {order.notes}
                  </div>
                )}
              </div>

              {/* Right panel: total + actions */}
              <div className="space-y-4">
                <div className={`${surface} p-6`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Total
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {order.lines.length} ligne{order.lines.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Actions */}
                <div className={`${surface} p-6`}>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Actions
                  </p>
                  <div className="flex flex-col gap-2">
                    {/* Confirm DRAFT */}
                    {order.status === "DRAFT" && isManager && (
                      <button
                        onClick={() => runAction(() => salesOrderService.confirm(order._id))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Confirmer
                      </button>
                    )}

                    {/* Mark / unmark urgent */}
                    {isManager && !["SHIPPED", "DELIVERED", "CLOSED", "CANCELLED"].includes(order.status) && (
                      <button
                        onClick={() => runAction(() => salesOrderService.markUrgent(order._id, !order.isUrgent))}
                        disabled={busy}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                          order.isUrgent
                            ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Zap size={14} />
                        {order.isUrgent ? "Retirer urgence" : "Marquer urgent"}
                      </button>
                    )}

                    {/* Prepare CONFIRMED */}
                    {order.status === "CONFIRMED" && (
                      <button
                        onClick={() => runAction(() => salesOrderService.prepare(order._id))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                        Préparer
                      </button>
                    )}

                    {/* Ship approval flow on PREPARED */}
                    {order.status === "PREPARED" && (() => {
                      const approval = order.shipApproval?.status ?? "NONE";
                      const canOpenShipment = !order.isUrgent || approval === "APPROVED";
                      return (
                        <>
                          {canOpenShipment ? (
                            <Link
                              href={`/dashboard/commercial/shipments?order=${order._id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                            >
                              <Truck size={14} />
                              Ouvrir expedition
                            </Link>
                          ) : approval === "PENDING" ? (
                            <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                              <Clock size={14} /> En attente d&apos;approbation
                            </span>
                          ) : (
                            <button
                              onClick={() => runAction(() => salesOrderService.requestApproval(order._id))}
                              disabled={busy}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                              Demander approbation
                            </button>
                          )}

                          {/* Manager: approve / reject pending */}
                          {isManager && approval === "PENDING" && (
                            <>
                              <button
                                onClick={() => runAction(() => salesOrderService.approveShip(order._id))}
                                disabled={busy}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                Approuver expédition
                              </button>

                              {rejectingApproval ? (
                                <div className="space-y-2">
                                  <textarea
                                    autoFocus
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Motif du rejet…"
                                    rows={2}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-rose-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => runAction(async () => {
                                        await salesOrderService.rejectShip(order._id, rejectReason);
                                        setRejectingApproval(false);
                                        setRejectReason("");
                                      })}
                                      disabled={!rejectReason.trim() || busy}
                                      className="flex-1 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                                    >
                                      Confirmer rejet
                                    </button>
                                    <button
                                      onClick={() => { setRejectingApproval(false); setRejectReason(""); }}
                                      className="rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRejectingApproval(true)}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                                >
                                  <ShieldX size={14} /> Rejeter
                                </button>
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}

                    {/* Deliver SHIPPED */}
                    {order.status === "SHIPPED" && isManager && (
                      <button
                        onClick={() => runAction(() => salesOrderService.deliver(order._id))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Marquer livré
                      </button>
                    )}

                    {/* Close DELIVERED */}
                    {order.status === "DELIVERED" && isManager && (
                      <button
                        onClick={() => runAction(() => salesOrderService.close(order._id))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Clôturer
                      </button>
                    )}

                    {/* Cancel */}
                    {isManager && ["CONFIRMED", "PREPARED"].includes(order.status) && (
                      <button
                        onClick={() => runAction(() => salesOrderService.cancel(order._id))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                      >
                        <XCircle size={14} /> Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Lines */}
            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">Lignes de commande</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {["Produit", "SKU", "Qté", "Prix unit.", "Remise", "Montant"].map((h) => (
                        <th key={h} className="px-6 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {line.productId?.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {line.productId?.sku || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{line.quantity}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {line.unitPrice.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{line.discount || 0}%</td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {lineAmount(line).toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-800">
                      <td colSpan={5} className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                        {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
