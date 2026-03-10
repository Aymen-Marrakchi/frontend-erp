"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
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
  XCircle,
  ChevronDown,
  ChevronRight,
  Archive,
  Clock,
  Download,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { stockInventoryService } from "@/services/stock/stockInventoryService";
import { stockProductService } from "@/services/stock/stockProductService";
import { stockDepotService, Depot } from "@/services/stock/stockDepotService";

// ─── Interfaces ──────────────────────────────────────────────────────────────

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
  status: "IN_PROGRESS" | "SENT_TO_DEPOT" | "PENDING_APPROVAL" | "CLOSED";
  notes?: string;
  startedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  depotId?: { _id: string; name: string } | null;
  startedBy?: { _id: string; name: string; role: string } | null;
}

interface ReasonEntry {
  reason: string;
  addedBy?: { name: string; role: string } | null;
  action: "DEPOT_REASON" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface InventoryLine {
  _id: string;
  inventoryCountId: string;
  productId: { _id: string; name: string; sku: string };
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  status: "PENDING" | "REVIEWED" | "APPROVED" | "REJECTED";
  depotReason?: string;
  reasonHistory?: ReasonEntry[];
  notes?: string;
  countedBy?: { name: string } | null;
  approvedBy?: { name: string } | null;
}

// ─── Styling helpers ──────────────────────────────────────────────────────────

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

const sessionStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    SENT_TO_DEPOT: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
};

const lineStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    REVIEWED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
};

const actionBadge = (action: string) => {
  const map: Record<string, string> = {
    DEPOT_REASON: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
    APPROVED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    REJECTED: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return map[action] ?? "bg-slate-100 text-slate-600";
};

const formatDate = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16 }}
        className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ─── Reason history accordion ─────────────────────────────────────────────────

function ReasonHistory({ history }: { history: ReasonEntry[] }) {
  const [open, setOpen] = useState(false);
  if (!history || history.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {history.length} entr{history.length === 1 ? "y" : "ies"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {history.map((entry, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${actionBadge(entry.action)}`}>
                  {entry.action.replace(/_/g, " ")}
                </span>
                {entry.addedBy && (
                  <span className="text-[10px] text-slate-400">{entry.addedBy.name}</span>
                )}
                <span className="text-[10px] text-slate-400 ml-auto">{formatShortDate(entry.createdAt)}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{entry.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StockInventoriesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  // Role flags
  const isStock = user?.role === "STOCK_MANAGER";
  const isDepot = user?.role === "DEPOT_MANAGER";
  const isAdmin = user?.role === "ADMIN";
  const canCreate = isStock || isAdmin;
  const canAddLines = isStock || isAdmin;
  const canSendToDepot = isStock || isAdmin;
  const canDepotReview = isDepot || isAdmin;
  const canApprove = isStock || isAdmin;

  // Data
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [selectedSession, setSelectedSession] = useState<InventorySession | null>(null);
  const [lines, setLines] = useState<InventoryLine[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<"active" | "log">("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lineLoading, setLineLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Journal variance data
  const [sessionLinesMap, setSessionLinesMap] = useState<Record<string, InventoryLine[]>>({});
  const [variancesLoading, setVariancesLoading] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState<{ lineId: string; lineName: string } | null>(null);

  // Forms
  const [sessionForm, setSessionForm] = useState({
    type: "PERIODIC" as "PERIODIC" | "PERMANENT",
    notes: "",
    depotId: "",
  });
  const [lineForm, setLineForm] = useState({
    productId: "",
    countedQuantity: "",
    notes: "",
  });
  const [reasonForm, setReasonForm] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError("");
      const promises: Promise<any>[] = [stockInventoryService.getAll()];
      if (canCreate) {
        promises.push(stockDepotService.getAll());
        promises.push(stockProductService.getAll());
      }
      const results = await Promise.all(promises);
      setSessions(results[0]);
      if (canCreate) {
        setDepots(results[1]);
        setProducts((results[2] as Product[]).filter((p) => p.status === "ACTIVE"));
      } else if (isDepot) {
        // Depot manager: just sessions (already fetched above)
        // Fetch products for adding lines if needed — depot can't add lines per spec
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load inventories.");
    } finally {
      setLoading(false);
    }
  }, [canCreate, isDepot, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchLines = async (id: string) => {
    try {
      setLineLoading(true);
      setLines(await stockInventoryService.getLines(id));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load lines.");
    } finally {
      setLineLoading(false);
    }
  };

  const openSession = async (session: InventorySession) => {
    setSelectedSession(session);
    await fetchLines(session._id);
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status !== "CLOSED"),
    [sessions]
  );

  const closedSessions = useMemo(
    () => sessions.filter((s) => s.status === "CLOSED"),
    [sessions]
  );

  const filteredActive = useMemo(() => {
    const q = search.toLowerCase();
    return activeSessions.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        (s.depotId?.name ?? "").toLowerCase().includes(q)
    );
  }, [activeSessions, search]);

  const filteredClosed = useMemo(() => {
    const q = search.toLowerCase();
    return closedSessions.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        (s.depotId?.name ?? "").toLowerCase().includes(q)
    );
  }, [closedSessions, search]);

  const depotSessions = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        (s.code.toLowerCase().includes(q) ||
          s.status.toLowerCase().includes(q) ||
          (s.depotId?.name ?? "").toLowerCase().includes(q))
    );
  }, [sessions, search]);

  // Lines computed
  const allReviewed = useMemo(
    () =>
      lines.length > 0 && lines.every((l) => l.status === "REVIEWED" || l.status === "APPROVED"),
    [lines]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setFormError("");
    if (!sessionForm.depotId) {
      setFormError("Please select a depot.");
      return;
    }
    try {
      setSubmitting(true);
      await stockInventoryService.create({
        type: sessionForm.type,
        notes: sessionForm.notes.trim(),
        depotId: sessionForm.depotId,
      });
      await fetchAll();
      setShowCreate(false);
      setSessionForm({ type: "PERIODIC", notes: "", depotId: "" });
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to create session.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLine = async () => {
    setFormError("");
    if (!selectedSession || !lineForm.productId || lineForm.countedQuantity === "") {
      setFormError("Product and counted quantity are required.");
      return;
    }
    try {
      setSubmitting(true);
      await stockInventoryService.addLine(selectedSession._id, {
        productId: lineForm.productId,
        countedQuantity: Number(lineForm.countedQuantity),
        notes: lineForm.notes.trim(),
      });
      await fetchLines(selectedSession._id);
      setShowAddLine(false);
      setLineForm({ productId: "", countedQuantity: "", notes: "" });
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to add line.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToDepot = async () => {
    if (!selectedSession) return;
    try {
      setSubmitting(true);
      await stockInventoryService.sendToDepot(selectedSession._id);
      const updated = { ...selectedSession, status: "SENT_TO_DEPOT" as const };
      setSelectedSession(updated);
      setSessions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send to depot.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDepotReason = async () => {
    setFormError("");
    if (!selectedSession || !showReasonModal || !reasonForm.trim()) {
      setFormError("Please provide a reason.");
      return;
    }
    try {
      setSubmitting(true);
      await stockInventoryService.addDepotReason(
        selectedSession._id,
        showReasonModal.lineId,
        reasonForm.trim()
      );
      await fetchLines(selectedSession._id);
      // Sync session status in case it changed (e.g. auto-advance)
      const updatedSessions: InventorySession[] = await stockInventoryService.getAll();
      setSessions(updatedSessions);
      const fresh = updatedSessions.find((s) => s._id === selectedSession._id);
      if (fresh) setSelectedSession(fresh);
      setShowReasonModal(null);
      setReasonForm("");
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to add reason.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDepotReview = async () => {
    if (!selectedSession) return;
    try {
      setSubmitting(true);
      await stockInventoryService.submitDepotReview(selectedSession._id);
      const updated = { ...selectedSession, status: "PENDING_APPROVAL" as const };
      setSelectedSession(updated);
      setSessions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit depot review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLine = async (lineId: string) => {
    if (!selectedSession) return;
    try {
      setActionLoadingId(lineId);
      await stockInventoryService.approveLine(selectedSession._id, lineId);
      await fetchLines(selectedSession._id);
      // Check if session closed — refetch all sessions
      const updatedSessions: InventorySession[] = await stockInventoryService.getAll();
      setSessions(updatedSessions);
      const fresh = updatedSessions.find((s) => s._id === selectedSession._id);
      if (fresh) setSelectedSession(fresh);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to approve line.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectLine = async (lineId: string) => {
    if (!selectedSession) return;
    try {
      setActionLoadingId(lineId);
      await stockInventoryService.rejectLine(selectedSession._id, lineId);
      await fetchLines(selectedSession._id);
      const updatedSessions: InventorySession[] = await stockInventoryService.getAll();
      setSessions(updatedSessions);
      const fresh = updatedSessions.find((s) => s._id === selectedSession._id);
      if (fresh) setSelectedSession(fresh);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reject line.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Journal: load variance data for all closed sessions ───────────────────

  const loadJournalVariances = useCallback(async (sessions: InventorySession[]) => {
    const closed = sessions.filter((s) => s.status === "CLOSED");
    if (closed.length === 0) return;
    setVariancesLoading(true);
    try {
      const results = await Promise.all(
        closed.map((s) => stockInventoryService.getLines(s._id).then((lines) => ({ id: s._id, lines })))
      );
      const map: Record<string, InventoryLine[]> = {};
      results.forEach(({ id, lines }) => { map[id] = lines; });
      setSessionLinesMap(map);
    } catch {
      // Non-critical — variance column just shows "—"
    } finally {
      setVariancesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "log" && closedSessions.length > 0) {
      loadJournalVariances(closedSessions);
    }
  }, [activeTab, closedSessions, loadJournalVariances]);

  const getSessionVariance = (sessionId: string): number | null => {
    const lines = sessionLinesMap[sessionId];
    if (!lines) return null;
    return lines.reduce((sum, l) => sum + (l.varianceQuantity ?? 0), 0);
  };

  // ── Export journal as CSV ──────────────────────────────────────────────────

  const exportJournal = () => {
    const rows: string[][] = [
      [t("codeCol"), t("depotCol"), t("type"), t("closedAtCol"), t("startedByCol"), t("product"), t("systemCol"), t("countedCol"), t("varianceCol"), t("status")],
    ];
    filteredClosed.forEach((session) => {
      const lines = sessionLinesMap[session._id] ?? [];
      if (lines.length === 0) {
        rows.push([
          session.code,
          session.depotId?.name ?? "",
          session.type,
          session.closedAt ? new Date(session.closedAt).toLocaleDateString() : "",
          session.startedBy?.name ?? "",
          "", "", "", "", "",
        ]);
      } else {
        lines.forEach((line) => {
          rows.push([
            session.code,
            session.depotId?.name ?? "",
            session.type,
            session.closedAt ? new Date(session.closedAt).toLocaleDateString() : "",
            session.startedBy?.name ?? "",
            `${line.productId.name} (${line.productId.sku})`,
            String(line.systemQuantity),
            String(line.countedQuantity),
            String(line.varianceQuantity),
            line.status,
          ]);
        });
      }
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const SessionRow = ({ session }: { session: InventorySession }) => (
    <button
      onClick={() => openSession(session)}
      className={`w-full px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
        selectedSession?._id === session._id ? "bg-slate-50 dark:bg-slate-800/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-white">{session.code}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {session.type}
            {session.depotId && (
              <>
                {" "}·{" "}
                <span className="text-slate-600 dark:text-slate-300">{session.depotId.name}</span>
              </>
            )}
          </p>
          {session.startedBy && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {t("byPrefix")} {session.startedBy.name}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${sessionStatusBadge(session.status)}`}
        >
          {session.status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {formatDate(session.startedAt || session.createdAt)}
      </p>
    </button>
  );

  // Session detail panel action buttons based on status + role
  const renderSessionActions = () => {
    if (!selectedSession) return null;
    const { status } = selectedSession;

    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* IN_PROGRESS: stock manager can add lines and send to depot */}
        {status === "IN_PROGRESS" && canAddLines && (
          <button
            onClick={() => { setFormError(""); setShowAddLine(true); }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus size={12} /> {t("addLineBtn")}
          </button>
        )}
        {status === "IN_PROGRESS" && canSendToDepot && (
          <button
            onClick={handleSendToDepot}
            disabled={submitting || lines.length === 0}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {t("sendToDepot")}
          </button>
        )}

        {/* SENT_TO_DEPOT: depot manager submits review */}
        {status === "SENT_TO_DEPOT" && canDepotReview && (
          <button
            onClick={handleSubmitDepotReview}
            disabled={submitting || !allReviewed}
            title={!allReviewed ? t("allLinesNeedReason") : ""}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {t("submitReview")}
          </button>
        )}
        {status === "SENT_TO_DEPOT" && canDepotReview && !allReviewed && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {t("addReasonFirst")}
          </p>
        )}
      </div>
    );
  };

  const renderLineActions = (line: InventoryLine) => {
    if (!selectedSession) return null;
    const { status: sessionStatus } = selectedSession;
    const busy = actionLoadingId === line._id;

    // SENT_TO_DEPOT or PENDING_APPROVAL: depot manager adds reason per PENDING or REJECTED line
    if ((sessionStatus === "SENT_TO_DEPOT" || sessionStatus === "PENDING_APPROVAL") && canDepotReview) {
      if (line.status === "PENDING" || line.status === "REJECTED") {
        return (
          <button
            onClick={() => { setFormError(""); setShowReasonModal({ lineId: line._id, lineName: line.productId.name }); setReasonForm(""); }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300"
          >
            <ClipboardList size={11} /> {t("addReason")}
          </button>
        );
      }
    }

    // PENDING_APPROVAL or SENT_TO_DEPOT: stock manager approves or rejects REVIEWED lines
    if ((sessionStatus === "PENDING_APPROVAL" || sessionStatus === "SENT_TO_DEPOT") && canApprove) {
      if (line.status === "REVIEWED") {
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleApproveLine(line._id)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
              {t("approve")}
            </button>
            <button
              onClick={() => handleRejectLine(line._id)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
              {t("reject")}
            </button>
          </div>
        );
      }
    }

    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER"]}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {isDepot ? t("depots") : t("stockModule")} · ERP
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t("inventories")}{" "}
              <span className="text-slate-400 dark:text-slate-500">
                {isDepot ? `— ${t("myDepot")}` : t("inventoryControl")}
              </span>
            </h1>
          </div>
          {canCreate && (
            <button
              onClick={() => { setFormError(""); setShowCreate(true); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus size={15} /> {t("newSession")}
            </button>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Tabs (stock/admin only) ── */}
        {(isStock || isAdmin) && (
          <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => { setActiveTab("active"); setSelectedSession(null); setLines([]); }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === "active"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Clock size={14} /> {t("activeSessions")}
              {activeSessions.length > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {activeSessions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("log"); setSelectedSession(null); setLines([]); }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === "log"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Archive size={14} /> {t("logTab")}
              {closedSessions.length > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {closedSessions.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── LOG TAB (closed sessions) ── */}
        {(isStock || isAdmin) && activeTab === "log" && (
          <div className={`${surface} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="font-semibold text-slate-950 dark:text-white">{t("closedSessions")}</h2>
              <div className="flex items-center gap-2">
                <div className="relative w-52">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search")}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <button
                  onClick={exportJournal}
                  disabled={filteredClosed.length === 0}
                  title={t("exportJournal")}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download size={13} /> {t("exportJournal")}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> {t("loadingDepots")}
              </div>
            ) : filteredClosed.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                {t("noClosedSessions")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      {[t("codeCol"), t("depotCol"), t("type"), t("closedAtCol"), t("startedByCol"), t("totalVarianceCol"), t("linesCol")].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredClosed.map((session) => {
                      const variance = getSessionVariance(session._id);
                      const linesCount = sessionLinesMap[session._id]?.length ?? null;
                      return (
                        <tr
                          key={session._id}
                          onClick={() => openSession(session)}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                            {session.code}
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                            {session.depotId?.name ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                            {session.type}
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                            {formatShortDate(session.closedAt)}
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                            {session.startedBy?.name ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            {variancesLoading && variance === null ? (
                              <Loader2 size={12} className="animate-spin text-slate-400" />
                            ) : variance === null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span
                                className={`font-semibold text-sm ${
                                  variance > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : variance < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {variance > 0 ? "+" : ""}{variance}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-sm">
                            {linesCount !== null ? linesCount : variancesLoading ? <Loader2 size={12} className="animate-spin text-slate-400" /> : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVE SESSIONS + DETAIL (two-column) ── */}
        {(activeTab === "active" || isDepot) && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Sessions list */}
            <div className={`${surface} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {isDepot ? t("myDepot") : t("activeSessions")}
                </h2>
                <div className="relative w-52">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search")}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> {t("loadingDepots")}
                </div>
              ) : (isDepot ? depotSessions : filteredActive).length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                  {t("noSessionsFound")}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(isDepot ? depotSessions : filteredActive).map((session) => (
                    <SessionRow key={session._id} session={session} />
                  ))}
                </div>
              )}
            </div>

            {/* Session detail panel */}
            <div className={`${surface} overflow-hidden`}>
              {!selectedSession ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-sm text-slate-400 dark:text-slate-500">
                  <ClipboardList size={32} className="opacity-30" />
                  {t("selectSessionPrompt")}
                </div>
              ) : (
                <>
                  {/* Session header */}
                  <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-slate-950 dark:text-white">
                          {selectedSession.code}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {selectedSession.type}
                          {selectedSession.depotId && (
                            <> · {selectedSession.depotId.name}</>
                          )}
                        </p>
                        {selectedSession.startedBy && (
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {t("startedByPrefix")} {selectedSession.startedBy.name}
                          </p>
                        )}
                        {selectedSession.notes && (
                          <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">
                            {selectedSession.notes}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${sessionStatusBadge(selectedSession.status)}`}
                      >
                        {selectedSession.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Workflow status guide */}
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {["IN_PROGRESS", "SENT_TO_DEPOT", "PENDING_APPROVAL", "CLOSED"].map((s, i, arr) => (
                        <span key={s} className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              selectedSession.status === s
                                ? sessionStatusBadge(s)
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                            }`}
                          >
                            {s.replace(/_/g, " ")}
                          </span>
                          {i < arr.length - 1 && <ChevronRight size={10} />}
                        </span>
                      ))}
                    </div>

                    {renderSessionActions()}
                  </div>

                  {/* Lines table */}
                  <div className="max-h-[480px] overflow-y-auto">
                    {lineLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                        <Loader2 size={14} className="animate-spin" /> {t("loadingLines")}
                      </div>
                    ) : lines.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t("noLinesYet")}
                        {selectedSession.status === "IN_PROGRESS" && canAddLines && (
                          <>
                            {" "}
                            <button
                              onClick={() => { setFormError(""); setShowAddLine(true); }}
                              className="underline hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              {t("addFirstLine")}
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                              {[t("product"), t("systemCol"), t("countedCol"), t("varianceCol"), t("status"), t("depotReasonCol"), t("actionsCol")].map(
                                (h) => (
                                  <th
                                    key={h}
                                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                                  >
                                    {h}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {lines.map((line) => (
                              <tr key={line._id} className="align-top">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {line.productId.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{line.productId.sku}</p>
                                  {line.countedBy && (
                                    <p className="text-[10px] text-slate-400">
                                      {t("byPrefix")} {line.countedBy.name}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                  {line.systemQuantity}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                  {line.countedQuantity}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`font-semibold ${
                                      line.varianceQuantity > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : line.varianceQuantity < 0
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {line.varianceQuantity > 0 ? "+" : ""}
                                    {line.varianceQuantity}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${lineStatusBadge(line.status)}`}
                                  >
                                    {line.status}
                                  </span>
                                  {line.approvedBy && (
                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      {t("byPrefix")} {line.approvedBy.name}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 max-w-[160px]">
                                  {line.reasonHistory && line.reasonHistory.length > 0 ? (
                                    <ReasonHistory history={line.reasonHistory} />
                                  ) : line.depotReason ? (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 break-words">
                                      {line.depotReason}
                                    </p>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {renderLineActions(line)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* Create session */}
        {showCreate && (
          <Modal title={t("newInventorySession")} onClose={() => setShowCreate(false)}>
            <div className="space-y-4">
              {formError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
                  {formError}
                </div>
              )}
              <div>
                <label className={labelClass}>{t("depotCol")}</label>
                <select
                  value={sessionForm.depotId}
                  onChange={(e) => setSessionForm((f) => ({ ...f, depotId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">{t("selectDepot")}</option>
                  {depots
                    .filter((d) => (d as any).status !== "INACTIVE")
                    .map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("type")}</label>
                <select
                  value={sessionForm.type}
                  onChange={(e) =>
                    setSessionForm((f) => ({ ...f, type: e.target.value as "PERIODIC" | "PERMANENT" }))
                  }
                  className={inputClass}
                >
                  <option value="PERIODIC">{t("periodic")}</option>
                  <option value="PERMANENT">{t("permanent")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("notesOptional")}</label>
                <textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className={inputClass}
                  placeholder={t("sessionNotesPlaceholder")}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {t("createSession")}
              </button>
            </div>
          </Modal>
        )}

        {/* Add line */}
        {showAddLine && (
          <Modal title={t("addCountLine")} onClose={() => setShowAddLine(false)}>
            <div className="space-y-4">
              {formError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
                  {formError}
                </div>
              )}
              <div>
                <label className={labelClass}>{t("product")}</label>
                <select
                  value={lineForm.productId}
                  onChange={(e) => setLineForm((f) => ({ ...f, productId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">{t("selectProduct")}</option>
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
                  type="number"
                  min={0}
                  value={lineForm.countedQuantity}
                  onChange={(e) => setLineForm((f) => ({ ...f, countedQuantity: e.target.value }))}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelClass}>{t("notesOptional")}</label>
                <input
                  value={lineForm.notes}
                  onChange={(e) => setLineForm((f) => ({ ...f, notes: e.target.value }))}
                  className={inputClass}
                  placeholder={t("optionalNotesPlaceholder")}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddLine(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddLine}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {t("addLineBtn")}
              </button>
            </div>
          </Modal>
        )}

        {/* Depot reason modal */}
        {showReasonModal && (
          <Modal
            title={`${t("addReason")} — ${showReasonModal.lineName}`}
            onClose={() => setShowReasonModal(null)}
          >
            <div className="space-y-4">
              {formError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
                  {formError}
                </div>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("reasonModalDesc")}
              </p>
              <div>
                <label className={labelClass}>{t("reason")}</label>
                <textarea
                  value={reasonForm}
                  onChange={(e) => setReasonForm(e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder={t("reasonPlaceholder")}
                  autoFocus
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowReasonModal(null)}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddDepotReason}
                disabled={submitting || !reasonForm.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {t("submitReason")}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
