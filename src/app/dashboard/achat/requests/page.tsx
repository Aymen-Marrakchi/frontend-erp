"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  X,
  Truck,
  AlertCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { purchaseRequestService } from "@/services/purchase/purchaseRequestService";

interface PurchaseRequest {
  _id: string;
  requestNo: string;
  productId: {
    _id: string;
    sku: string;
    name: string;
  };
  requestedQuantity: number;
  reason: string;
  priority: "LOW" | "NORMAL" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  sourceAlertId?: { _id: string; type: string } | null;
  createdBy?: { _id: string; name: string; role: string } | null;
  handledBy?: { _id: string; name: string; role: string } | null;
  notes: string;
  completedAt?: string | null;
  createdAt: string;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <X size={13} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

export default function PurchaseRequestsPage() {
  const { t } = useLanguage();

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionRequest, setActionRequest] = useState<PurchaseRequest | null>(null);
  const [actionType, setActionType] = useState<"IN_PROGRESS" | "COMPLETED" | "REJECTED" | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await purchaseRequestService.getAll();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load purchase requests");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      const matchSearch =
        r.requestNo.toLowerCase().includes(q) ||
        r.productId?.name?.toLowerCase().includes(q) ||
        r.productId?.sku?.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" ? true : r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
      completed: requests.filter((r) => r.status === "COMPLETED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    }),
    [requests]
  );

  const openAction = (
    request: PurchaseRequest,
    type: "IN_PROGRESS" | "COMPLETED" | "REJECTED"
  ) => {
    setActionRequest(request);
    setActionType(type);
    setActionNotes("");
    setActionError("");
  };

  const handleAction = async () => {
    if (!actionRequest || !actionType) return;
    try {
      setActionSubmitting(true);
      setActionError("");
      await purchaseRequestService.updateStatus(actionRequest._id, actionType, actionNotes);
      setActionRequest(null);
      setActionType(null);
      await fetchRequests();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionSubmitting(false);
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

  const statusBadge = (status: PurchaseRequest["status"]) => {
    if (status === "PENDING") return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  };

  const priorityBadge = (priority: PurchaseRequest["priority"]) => {
    if (priority === "URGENT") return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
    if (priority === "LOW") return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  };

  const actionLabel = (type: typeof actionType) => {
    if (type === "IN_PROGRESS") return t("markInProgress");
    if (type === "COMPLETED") return t("markCompleted");
    if (type === "REJECTED") return t("rejectRequestAction");
    return "";
  };

  const actionColor = (type: typeof actionType) => {
    if (type === "COMPLETED") return "bg-emerald-700 hover:bg-emerald-600 text-white";
    if (type === "REJECTED") return "bg-rose-700 hover:bg-rose-600 text-white";
    return "bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100";
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("purchaseModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Truck size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t("purchaseRequestsTitle")}{" "}
              <span className="text-slate-400 dark:text-slate-500">{t("management")}</span>
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { labelKey: "pending" as const, value: stats.pending, Icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
            { labelKey: "inProgress" as const, value: stats.inProgress, Icon: PlayCircle, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { labelKey: "completed" as const, value: stats.completed, Icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { labelKey: "rejected" as const, value: stats.rejected, Icon: XCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${surface} flex items-center gap-4 px-5 py-5`}
            >
              <div className={`rounded-2xl p-3 ${card.bg}`}>
                <card.Icon size={16} className={card.color} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t(card.labelKey)}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t("purchaseRequestsTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} {t("ofText")} {requests.length} {t("requests")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                  placeholder={t("searchPurchaseReqs")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="ALL">{t("allStatus")}</option>
                <option value="PENDING">{t("pending")}</option>
                <option value="IN_PROGRESS">{t("inProgress")}</option>
                <option value="COMPLETED">{t("completed")}</option>
                <option value="REJECTED">{t("rejected")}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              {t("loadingDepots")}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 px-6 py-10 text-sm text-rose-600 dark:text-rose-400">
              <AlertCircle size={14} />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ShoppingCart size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("noPurchaseRequests")}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {t("requestsFromAlerts")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">{t("requestNo")}</th>
                    <th className="px-6 py-3 font-medium">{t("product")}</th>
                    <th className="px-6 py-3 font-medium">{t("qty")}</th>
                    <th className="px-6 py-3 font-medium">{t("priority")}</th>
                    <th className="px-6 py-3 font-medium">{t("status")}</th>
                    <th className="px-6 py-3 font-medium">{t("requestedBy")}</th>
                    <th className="px-6 py-3 font-medium">{t("date")}</th>
                    <th className="px-6 py-3 font-medium">{t("actionsCol")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((req, i) => (
                    <motion.tr
                      key={req._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {req.requestNo}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {req.productId?.name || "—"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {req.productId?.sku}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                        {req.requestedQuantity}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityBadge(req.priority)}`}>
                          {req.priority}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(req.status)}`}>
                          {req.status === "PENDING" && <Clock size={10} />}
                          {req.status === "IN_PROGRESS" && <PlayCircle size={10} />}
                          {req.status === "COMPLETED" && <CheckCircle2 size={10} />}
                          {req.status === "REJECTED" && <XCircle size={10} />}
                          {req.status === "PENDING" && t("pending")}
                          {req.status === "IN_PROGRESS" && t("inProgress")}
                          {req.status === "COMPLETED" && t("completed")}
                          {req.status === "REJECTED" && t("rejected")}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {req.createdBy?.name || "—"}
                      </td>

                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {formatDateTime(req.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {req.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => openAction(req, "IN_PROGRESS")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300"
                              >
                                <PlayCircle size={11} />
                                {t("startRequest")}
                              </button>
                              <button
                                onClick={() => openAction(req, "REJECTED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                              >
                                <XCircle size={11} />
                                {t("reject")}
                              </button>
                            </>
                          )}

                          {req.status === "IN_PROGRESS" && (
                            <>
                              <button
                                onClick={() => openAction(req, "COMPLETED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                              >
                                <CheckCircle2 size={11} />
                                {t("completeRequest")}
                              </button>
                              <button
                                onClick={() => openAction(req, "REJECTED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                              >
                                <XCircle size={11} />
                                {t("reject")}
                              </button>
                            </>
                          )}

                          {(req.status === "COMPLETED" || req.status === "REJECTED") && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {req.completedAt ? formatDateTime(req.completedAt) : "—"}
                            </span>
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

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {actionRequest && actionType && (
          <Modal
            title={actionLabel(actionType)}
            onClose={() => { setActionRequest(null); setActionType(null); }}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{t("requestLabel")}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">
                  {actionRequest.requestNo}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {actionRequest.productId?.name} · {t("qty")}: {actionRequest.requestedQuantity}
                </p>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
                  <X size={13} />
                  {actionError}
                </div>
              )}

              <div>
                <label className={labelClass}>{t("notesOptional")}</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder={
                    actionType === "REJECTED"
                      ? t("rejectionReasonPlaceholder")
                      : actionType === "COMPLETED"
                      ? t("completionNotesPlaceholder")
                      : t("notesPlaceholder")
                  }
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleAction}
                  disabled={actionSubmitting}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 ${actionColor(actionType)}`}
                >
                  {actionSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : actionType === "COMPLETED" ? (
                    <CheckCircle2 size={14} />
                  ) : actionType === "REJECTED" ? (
                    <XCircle size={14} />
                  ) : (
                    <PlayCircle size={14} />
                  )}
                  {actionLabel(actionType)}
                </button>
                <button
                  onClick={() => { setActionRequest(null); setActionType(null); }}
                  disabled={actionSubmitting}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
