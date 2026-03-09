"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Send,
  X,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { stockInventoryService } from "@/services/stock/stockInventoryService";
import { stockProductService } from "@/services/stock/stockProductService";

interface Product {
  _id: string;
  sku: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface InventorySession {
  _id: string;
  code: string;
  type: "PERIODIC" | "PERMANENT";
  status:
    | "DRAFT"
    | "IN_PROGRESS"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "CLOSED";
  notes?: string;
  startedAt?: string | null;
  createdAt: string;
}

interface InventoryLine {
  _id: string;
  inventoryCountId: string;
  productId: Product;
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  status: "COUNTED" | "VARIANCE_FOUND" | "VALIDATED";
  notes?: string;
  countedAt?: string | null;
}

interface Adjustment {
  _id: string;
  productId: Product;
  systemQuantity: number;
  countedQuantity: number;
  deltaQuantity: number;
  reason: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "APPLIED";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export default function StockInventoriesPage() {
  const { t } = useLanguage();

  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedSession, setSelectedSession] = useState<InventorySession | null>(null);
  const [lines, setLines] = useState<InventoryLine[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lineLoading, setLineLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showCreateAdjustment, setShowCreateAdjustment] = useState(false);

  const [sessionForm, setSessionForm] = useState({
    type: "PERIODIC" as "PERIODIC" | "PERMANENT",
    notes: "",
  });

  const [lineForm, setLineForm] = useState({
    productId: "",
    countedQuantity: "",
    lotRef: "",
    notes: "",
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    inventoryCountLineId: "",
    reason: "",
  });

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [sessionData, productData, adjustmentData] = await Promise.all([
        stockInventoryService.getAll(),
        stockProductService.getAll(),
        stockInventoryService.getAdjustments(),
      ]);
      setSessions(sessionData);
      setProducts(productData.filter((p: Product) => p.status === "ACTIVE"));
      setAdjustments(adjustmentData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load inventories");
    } finally {
      setLoading(false);
    }
  };

  const fetchLines = async (sessionId: string) => {
    try {
      setLineLoading(true);
      const data = await stockInventoryService.getLines(sessionId);
      setLines(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load inventory lines");
    } finally {
      setLineLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const varianceLines = useMemo(
    () => lines.filter((l) => l.varianceQuantity !== 0),
    [lines]
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

  const openSession = async (session: InventorySession) => {
    setSelectedSession(session);
    await fetchLines(session._id);
  };

  const handleCreateSession = async () => {
    try {
      setSubmitting(true);
      setFormError("");
      await stockInventoryService.create(sessionForm);
      await fetchAll();
      setShowCreateSession(false);
      setSessionForm({ type: "PERIODIC", notes: "" });
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create inventory session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLine = async () => {
    if (!selectedSession) return;
    if (!lineForm.productId || !lineForm.countedQuantity) {
      setFormError("Product and counted quantity are required");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      await stockInventoryService.addLine(selectedSession._id, {
        productId: lineForm.productId,
        countedQuantity: Number(lineForm.countedQuantity),
        lotRef: lineForm.lotRef.trim(),
        notes: lineForm.notes.trim(),
      });
      await fetchLines(selectedSession._id);
      await fetchAll();
      setShowAddLine(false);
      setLineForm({ productId: "", countedQuantity: "", lotRef: "", notes: "" });
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to add line");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSession = async () => {
    if (!selectedSession) return;
    try {
      setSubmitting(true);
      await stockInventoryService.submit(selectedSession._id);
      await fetchAll();
      const updated = sessions.find((s) => s._id === selectedSession._id);
      setSelectedSession(
        updated
          ? { ...updated, status: "PENDING_APPROVAL" }
          : { ...selectedSession, status: "PENDING_APPROVAL" }
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!adjustmentForm.inventoryCountLineId || !adjustmentForm.reason.trim()) {
      setFormError("Line and reason are required");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      await stockInventoryService.createAdjustment({
        inventoryCountLineId: adjustmentForm.inventoryCountLineId,
        reason: adjustmentForm.reason.trim(),
      });
      await fetchAll();
      setShowCreateAdjustment(false);
      setAdjustmentForm({ inventoryCountLineId: "", reason: "" });
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdjustmentStatus = async (
    id: string,
    status: "APPROVED" | "REJECTED" | "APPLIED"
  ) => {
    try {
      setSubmitting(true);
      await stockInventoryService.updateAdjustmentStatus(id, status);
      await fetchAll();
      if (selectedSession) await fetchLines(selectedSession._id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update adjustment");
    } finally {
      setSubmitting(false);
    }
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
              {t("inventories")}{" "}
              <span className="text-slate-400 dark:text-slate-500">Control</span>
            </h1>
          </div>

          <button
            onClick={() => {
              setFormError("");
              setShowCreateSession(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={15} />
            {t("createInventory")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: t("inventories"), value: String(sessions.length), sub: "sessions" },
            {
              label: "In Progress",
              value: String(sessions.filter((s) => s.status === "IN_PROGRESS").length),
              sub: "active counts",
            },
            {
              label: "Pending Approval",
              value: String(sessions.filter((s) => s.status === "PENDING_APPROVAL").length),
              sub: "awaiting validation",
            },
            {
              label: t("adjustments"),
              value: String(adjustments.length),
              sub: "created adjustments",
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${surface} flex items-center gap-4 px-5 py-5`}
            >
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <ClipboardList size={16} />
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={`${surface} overflow-hidden`}>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {t("inventories")}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filteredSessions.length} {t("ofText")} {sessions.length} {t("records")}
                </p>
              </div>

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
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </div>
            ) : error ? (
              <div className="px-6 py-10 text-sm text-rose-600 dark:text-rose-400">{error}</div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("noResults")}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSessions.map((session) => (
                  <button
                    key={session._id}
                    onClick={() => openSession(session)}
                    className={`w-full px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                      selectedSession?._id === session._id ? "bg-slate-50 dark:bg-slate-800/20" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {session.code}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {session.type} · {formatDateTime(session.startedAt || session.createdAt)}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {session.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`${surface} overflow-hidden`}>
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {selectedSession ? selectedSession.code : "Session Details"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedSession
                      ? `${selectedSession.type} · ${selectedSession.status}`
                      : "Select an inventory session"}
                  </p>
                </div>

                {selectedSession && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setFormError("");
                        setShowAddLine(true);
                      }}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Plus size={14} className="mr-1 inline" />
                      Add Line
                    </button>

                    <button
                      onClick={handleSubmitSession}
                      disabled={
                        submitting ||
                        lines.length === 0 ||
                        !["DRAFT", "IN_PROGRESS"].includes(selectedSession?.status ?? "")
                      }
                      title={
                        lines.length === 0
                          ? "Add at least one count line before submitting"
                          : !["DRAFT", "IN_PROGRESS"].includes(selectedSession?.status ?? "")
                            ? "Session already submitted or closed"
                            : undefined
                      }
                      className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      <Send size={14} className="mr-1 inline" />
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!selectedSession ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                Choose a session to manage lines and adjustments.
              </div>
            ) : lineLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Loading lines...
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                      Count Lines
                    </h3>

                    <button
                      onClick={() => {
                        setFormError("");
                        setShowCreateAdjustment(true);
                      }}
                      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ShieldCheck size={14} className="mr-1 inline" />
                      Create Adjustment
                    </button>
                  </div>

                  {lines.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      No lines added yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                          <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            <th className="px-4 py-3 font-medium">{t("product")}</th>
                            <th className="px-4 py-3 font-medium">System</th>
                            <th className="px-4 py-3 font-medium">{t("countedQuantity")}</th>
                            <th className="px-4 py-3 font-medium">{t("varianceQuantity")}</th>
                            <th className="px-4 py-3 font-medium">{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {lines.map((line) => (
                            <tr key={line._id}>
                              <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">
                                {line.productId?.name || "—"}
                              </td>
                              <td className="px-4 py-4">{line.systemQuantity}</td>
                              <td className="px-4 py-4">{line.countedQuantity}</td>
                              <td className="px-4 py-4">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                    line.varianceQuantity === 0
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  }`}
                                >
                                  {line.varianceQuantity}
                                </span>
                              </td>
                              <td className="px-4 py-4">{line.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-base font-semibold text-slate-950 dark:text-white">
                    {t("adjustments")}
                  </h3>

                  {adjustments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      No adjustments yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adjustments.map((adj) => (
                        <div
                          key={adj._id}
                          className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-950 dark:text-white">
                                {adj.productId?.name || "—"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                System: {adj.systemQuantity} · Counted: {adj.countedQuantity} · Delta:{" "}
                                {adj.deltaQuantity}
                              </p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {adj.reason}
                              </p>
                            </div>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {adj.status}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {adj.status === "PENDING_APPROVAL" && (
                              <>
                                <button
                                  onClick={() => handleUpdateAdjustmentStatus(adj._id, "APPROVED")}
                                  disabled={submitting}
                                  className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                                >
                                  <CheckCircle2 size={12} className="mr-1 inline" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateAdjustmentStatus(adj._id, "REJECTED")}
                                  disabled={submitting}
                                  className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {adj.status === "APPROVED" && (
                              <button
                                onClick={() => handleUpdateAdjustmentStatus(adj._id, "APPLIED")}
                                disabled={submitting}
                                className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-950/20"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateSession && (
          <Modal title={t("createInventory")} onClose={() => setShowCreateSession(false)}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Type</label>
                <select
                  className={inputClass}
                  value={sessionForm.type}
                  onChange={(e) =>
                    setSessionForm((f) => ({
                      ...f,
                      type: e.target.value as "PERIODIC" | "PERMANENT",
                    }))
                  }
                >
                  <option value="PERIODIC">PERIODIC</option>
                  <option value="PERMANENT">PERMANENT</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${inputClass} min-h-[90px] resize-none`}
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {formError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {formError}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateSession(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateSession}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {t("createInventory")}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showAddLine && selectedSession && (
          <Modal title="Add Count Line" onClose={() => setShowAddLine(false)}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t("product")}</label>
                <select
                  className={inputClass}
                  value={lineForm.productId}
                  onChange={(e) => setLineForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">— Select Product —</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} · {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>{t("countedQuantity")}</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={lineForm.countedQuantity}
                  onChange={(e) =>
                    setLineForm((f) => ({ ...f, countedQuantity: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Lot Ref</label>
                <input
                  className={inputClass}
                  value={lineForm.lotRef}
                  onChange={(e) => setLineForm((f) => ({ ...f, lotRef: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${inputClass} min-h-[90px] resize-none`}
                  value={lineForm.notes}
                  onChange={(e) => setLineForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {formError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {formError}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddLine(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddLine}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Line
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showCreateAdjustment && selectedSession && (
          <Modal title="Create Adjustment" onClose={() => setShowCreateAdjustment(false)}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Inventory Line</label>
                <select
                  className={inputClass}
                  value={adjustmentForm.inventoryCountLineId}
                  onChange={(e) =>
                    setAdjustmentForm((f) => ({
                      ...f,
                      inventoryCountLineId: e.target.value,
                    }))
                  }
                >
                  <option value="">— Select Line —</option>
                  {varianceLines.map((line) => (
                    <option key={line._id} value={line._id}>
                      {line.productId?.sku} · {line.productId?.name} · Variance {line.varianceQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>{t("reason")}</label>
                <textarea
                  className={`${inputClass} min-h-[90px] resize-none`}
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>

              {formError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {formError}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateAdjustment(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateAdjustment}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Adjustment
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}