"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Factory,
  Clock,
  CheckCircle2,
  PlayCircle,
  CalendarDays,
  Zap,
  Settings,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { productionOrderService, type ProductionOrder } from "@/services/production/productionOrderService";
import { workCenterService, type WorkCenter } from "@/services/production/workCenterService";
import { stockProductService } from "@/services/stock/stockProductService";
import { salesOrderService } from "@/services/commercial/salesOrderService";

// ── helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  NORMAL: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  HIGH: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  URGENT: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const PRIORITY_BAR: Record<string, string> = {
  LOW: "bg-slate-400",
  NORMAL: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-rose-500",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  SCHEDULED: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  IN_PROGRESS: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const getMonday = (weekOffset: number) => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-5 flex items-center justify-between">
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

export default function ProductionPage() {
  const { t } = useLanguage();

  const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
  const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";
  const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

  // ── state ──
  const [weekOffset, setWeekOffset] = useState(0);
  const [allOrders, setAllOrders] = useState<ProductionOrder[]>([]);
  const [timelineOrders, setTimelineOrders] = useState<ProductionOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [showSchedule, setShowSchedule] = useState<ProductionOrder | null>(null);
  const [showComplete, setShowComplete] = useState<ProductionOrder | null>(null);
  const [formError, setFormError] = useState("");

  // forms
  const emptyCreate = { productId: "", quantity: "", priority: "NORMAL", estimatedHours: "", salesOrderId: "", notes: "" };
  const [createForm, setCreateForm] = useState(emptyCreate);
  const emptySchedule = { workCenterId: "", scheduledStart: "", scheduledEnd: "" };
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [completeQty, setCompleteQty] = useState("");

  // ── week ──
  const weekStart = useMemo(() => getMonday(weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }),
    [weekStart]
  );
  const weekLabel = `${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  // ── fetch ──
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [orders, wcs, prods, soData] = await Promise.all([
        productionOrderService.getAll(),
        workCenterService.getAll(),
        stockProductService.getAll(),
        salesOrderService.getAll(),
      ]);
      setAllOrders(orders);
      setWorkCenters(wcs);
      setProducts(prods);
      setSalesOrders(soData.filter((o: any) => o.status === "CONFIRMED"));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const orders = await productionOrderService.getTimeline(weekStart.toISOString(), weekEnd.toISOString());
      setTimelineOrders(orders);
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchTimeline(); }, [weekOffset]);

  // ── KPIs ──
  const kpis = useMemo(() => ({
    total: allOrders.length,
    draft: allOrders.filter(o => o.status === "DRAFT").length,
    scheduled: allOrders.filter(o => o.status === "SCHEDULED").length,
    inProgress: allOrders.filter(o => o.status === "IN_PROGRESS").length,
    completed: allOrders.filter(o => o.status === "COMPLETED").length,
  }), [allOrders]);

  // ── Gantt helpers ──
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const getOrderPosition = (order: ProductionOrder) => {
    if (!order.scheduledStart || !order.scheduledEnd) return null;
    const start = new Date(order.scheduledStart).getTime();
    const end = new Date(order.scheduledEnd).getTime();
    const ws = weekStart.getTime();
    const we = weekEnd.getTime() + 1;
    const clampedStart = Math.max(start, ws);
    const clampedEnd = Math.min(end, we);
    if (clampedEnd <= clampedStart) return null;
    const leftPct = ((clampedStart - ws) / WEEK_MS) * 100;
    const widthPct = ((clampedEnd - clampedStart) / WEEK_MS) * 100;
    return { left: `${leftPct.toFixed(2)}%`, width: `${Math.max(widthPct, 1).toFixed(2)}%` };
  };

  const ordersPerWC = useMemo(() => {
    const map: Record<string, ProductionOrder[]> = {};
    for (const wc of workCenters) map[wc._id] = [];
    for (const o of timelineOrders) {
      const wcId = o.workCenterId?._id;
      if (wcId && map[wcId]) map[wcId].push(o);
    }
    return map;
  }, [workCenters, timelineOrders]);

  // ── actions ──
  const runAction = async (action: () => Promise<any>, key: string) => {
    setActionLoading(key);
    try {
      await action();
      await fetchAll();
      await fetchTimeline();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.productId || !createForm.quantity) { setFormError("Product and quantity are required"); return; }
    try {
      setSubmitting(true); setFormError("");
      await productionOrderService.create({
        productId: createForm.productId,
        quantity: Number(createForm.quantity),
        priority: createForm.priority,
        estimatedHours: Number(createForm.estimatedHours) || 0,
        salesOrderId: createForm.salesOrderId || undefined,
        notes: createForm.notes,
      });
      await fetchAll();
      setShowCreate(false);
      setCreateForm(emptyCreate);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create");
    } finally { setSubmitting(false); }
  };

  const handleSchedule = async () => {
    if (!scheduleForm.workCenterId || !scheduleForm.scheduledStart || !scheduleForm.scheduledEnd) {
      setFormError("All schedule fields are required"); return;
    }
    try {
      setSubmitting(true); setFormError("");
      await productionOrderService.schedule(showSchedule!._id, {
        workCenterId: scheduleForm.workCenterId,
        scheduledStart: scheduleForm.scheduledStart,
        scheduledEnd: scheduleForm.scheduledEnd,
      });
      await fetchAll(); await fetchTimeline();
      setShowSchedule(null); setScheduleForm(emptySchedule);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to schedule");
    } finally { setSubmitting(false); }
  };

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      await productionOrderService.complete(showComplete!._id, completeQty ? Number(completeQty) : undefined);
      await fetchAll(); await fetchTimeline();
      setShowComplete(null); setCompleteQty("");
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to complete");
    } finally { setSubmitting(false); }
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Production
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Scheduling{" "}
              <span className="text-slate-400 dark:text-slate-500">& Planning</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/production/work-centers"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings size={15} />
              Work Centers
            </Link>
            <button
              onClick={() => { setCreateForm(emptyCreate); setFormError(""); setShowCreate(true); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus size={15} />
              New Production Order
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: "Total", value: kpis.total, icon: <Factory size={16} />, color: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
            { label: "Draft", value: kpis.draft, icon: <Clock size={16} />, color: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
            { label: "Scheduled", value: kpis.scheduled, icon: <CalendarDays size={16} />, color: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" },
            { label: "In Progress", value: kpis.inProgress, icon: <PlayCircle size={16} />, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
            { label: "Completed", value: kpis.completed, icon: <CheckCircle2 size={16} />, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${surface} flex items-center gap-3 px-4 py-4`}>
              <div className={`rounded-2xl p-2.5 ${kpi.color}`}>{kpi.icon}</div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Gantt Timeline */}
        <div className={surface}>
          {/* Gantt header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Production Timeline</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(0)}
                className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Today
              </button>
              <button onClick={() => setWeekOffset(w => w - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Gantt body */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: 700 }}>
              {/* Day header row */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <div className="w-44 flex-shrink-0 border-r border-slate-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Work Center
                </div>
                <div className="flex flex-1">
                  {weekDays.map((d, i) => {
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <div key={i} className={`flex-1 border-r border-slate-100 py-2 text-center text-[11px] font-medium dark:border-slate-800/60 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
                        <div className="uppercase tracking-wide">{DAY_LABELS[i]}</div>
                        <div className={`mt-0.5 text-base font-bold ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>{d.getDate()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Work center rows */}
              {workCenters.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No work centers configured.{" "}
                  <Link href="/dashboard/production/work-centers" className="text-blue-600 underline dark:text-blue-400">Add one</Link>
                </div>
              ) : (
                workCenters.map((wc) => {
                  const wcOrders = ordersPerWC[wc._id] || [];
                  return (
                    <div key={wc._id} className="flex border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                      <div className="w-44 flex-shrink-0 border-r border-slate-100 px-4 py-3 dark:border-slate-800/60">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{wc.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{wc.code}</p>
                      </div>
                      <div className="relative flex-1 py-2" style={{ minHeight: 52 }}>
                        {/* Day grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {weekDays.map((d, i) => {
                            const isToday = d.toDateString() === today.toDateString();
                            return (
                              <div key={i} className={`flex-1 border-r border-slate-100 dark:border-slate-800/60 ${isToday ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`} />
                            );
                          })}
                        </div>
                        {/* Order bars */}
                        {wcOrders.map(order => {
                          const pos = getOrderPosition(order);
                          if (!pos) return null;
                          return (
                            <div
                              key={order._id}
                              style={{ left: pos.left, width: pos.width }}
                              className={`absolute top-2 h-8 rounded-lg px-2 text-[11px] font-medium text-white flex items-center gap-1 overflow-hidden shadow-sm cursor-default ${PRIORITY_BAR[order.priority]}`}
                              title={`${order.orderNo} · ${order.productId.name} · ${order.quantity} ${order.productId.unit}`}
                            >
                              <span className="truncate">{order.orderNo}</span>
                              <span className="opacity-75 hidden sm:inline">· {order.productId.name}</span>
                            </div>
                          );
                        })}
                        {wcOrders.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-slate-300 dark:text-slate-600">No orders this week</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-6 py-3 dark:border-slate-800">
            <span className="text-xs text-slate-400 dark:text-slate-500">Priority:</span>
            {[["LOW","bg-slate-400"],["NORMAL","bg-blue-500"],["HIGH","bg-amber-500"],["URGENT","bg-rose-500"]].map(([p, c]) => (
              <span key={p} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className={`h-3 w-3 rounded-sm ${c}`} />{p}
              </span>
            ))}
          </div>
        </div>

        {/* Orders list */}
        <div className={surface}>
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">All Production Orders</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{allOrders.length} orders total</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : allOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">No production orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Product</th>
                    <th className="px-6 py-3 font-medium">Qty</th>
                    <th className="px-6 py-3 font-medium">Priority</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Work Center</th>
                    <th className="px-6 py-3 font-medium">Scheduled</th>
                    <th className="px-6 py-3 font-medium">Sales Order</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {allOrders.map((order, i) => (
                    <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{order.orderNo}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">{order.productId.name}</p>
                        <p className="text-xs text-slate-400">{order.productId.sku}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.quantity} <span className="text-slate-400">{order.productId.unit}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${PRIORITY_COLOR[order.priority]}`}>
                          {order.priority === "URGENT" && <Zap size={10} />}{order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLOR[order.status]}`}>
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.workCenterId?.name || <span className="text-slate-400">—</span>}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {order.scheduledStart ? (
                          <span>{new Date(order.scheduledStart).toLocaleDateString()} → {new Date(order.scheduledEnd!).toLocaleDateString()}</span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {order.salesOrderId?.orderNo || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {order.status === "DRAFT" && (
                            <button onClick={() => { setScheduleForm(emptySchedule); setFormError(""); setShowSchedule(order); }}
                              className="rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300">
                              Schedule
                            </button>
                          )}
                          {order.status === "SCHEDULED" && (
                            <>
                              <button onClick={() => { setScheduleForm(emptySchedule); setFormError(""); setShowSchedule(order); }}
                                className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                                Reschedule
                              </button>
                              <button
                                disabled={actionLoading === order._id}
                                onClick={() => runAction(() => productionOrderService.start(order._id), order._id)}
                                className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 disabled:opacity-50">
                                {actionLoading === order._id ? <Loader2 size={11} className="animate-spin" /> : "Start"}
                              </button>
                            </>
                          )}
                          {order.status === "IN_PROGRESS" && (
                            <button onClick={() => { setCompleteQty(""); setFormError(""); setShowComplete(order); }}
                              className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300">
                              Complete
                            </button>
                          )}
                          {!["COMPLETED", "CANCELLED"].includes(order.status) && (
                            <button
                              disabled={actionLoading === `cancel-${order._id}`}
                              onClick={() => runAction(() => productionOrderService.cancel(order._id), `cancel-${order._id}`)}
                              className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300 disabled:opacity-50">
                              Cancel
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

      <AnimatePresence>
        {/* Create modal */}
        {showCreate && (
          <Modal title="New Production Order" onClose={() => setShowCreate(false)}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Product *</label>
                <select className={inputClass} value={createForm.productId} onChange={e => setCreateForm(f => ({ ...f, productId: e.target.value }))}>
                  <option value="">— Select product —</option>
                  {products.map((p: any) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Quantity *</label>
                  <input className={inputClass} type="number" min={1} placeholder="0" value={createForm.quantity}
                    onChange={e => setCreateForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Est. Hours</label>
                  <input className={inputClass} type="number" min={0} placeholder="0" value={createForm.estimatedHours}
                    onChange={e => setCreateForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select className={inputClass} value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Link to Sales Order (optional)</label>
                <select className={inputClass} value={createForm.salesOrderId} onChange={e => setCreateForm(f => ({ ...f, salesOrderId: e.target.value }))}>
                  <option value="">— None —</option>
                  {salesOrders.map((o: any) => <option key={o._id} value={o._id}>{o.orderNo}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} rows={2} placeholder="Optional notes..." value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {formError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={handleCreate} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Schedule modal */}
        {showSchedule && (
          <Modal title={`Schedule ${showSchedule.orderNo}`} onClose={() => setShowSchedule(null)}>
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
                <p className="font-medium text-slate-900 dark:text-white">{showSchedule.productId.name}</p>
                <p className="text-slate-500 dark:text-slate-400">Qty: {showSchedule.quantity} {showSchedule.productId.unit} · {showSchedule.estimatedHours}h estimated</p>
              </div>
              <div>
                <label className={labelClass}>Work Center *</label>
                <select className={inputClass} value={scheduleForm.workCenterId} onChange={e => setScheduleForm(f => ({ ...f, workCenterId: e.target.value }))}>
                  <option value="">— Select work center —</option>
                  {workCenters.filter(w => w.active).map(wc => <option key={wc._id} value={wc._id}>{wc.name} ({wc.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input type="datetime-local" className={inputClass} value={scheduleForm.scheduledStart}
                    onChange={e => setScheduleForm(f => ({ ...f, scheduledStart: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>End Date *</label>
                  <input type="datetime-local" className={inputClass} value={scheduleForm.scheduledEnd}
                    onChange={e => setScheduleForm(f => ({ ...f, scheduledEnd: e.target.value }))} />
                </div>
              </div>
              {formError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowSchedule(null)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={handleSchedule} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-60">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />} Schedule
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Complete modal */}
        {showComplete && (
          <Modal title={`Complete ${showComplete.orderNo}`} onClose={() => setShowComplete(null)}>
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
                <p className="font-medium text-slate-900 dark:text-white">{showComplete.productId.name}</p>
                <p className="text-slate-500 dark:text-slate-400">Planned qty: {showComplete.quantity} {showComplete.productId.unit}</p>
              </div>
              <div>
                <label className={labelClass}>Completed Qty (leave blank for full quantity)</label>
                <input className={inputClass} type="number" min={1} placeholder={String(showComplete.quantity)} value={completeQty}
                  onChange={e => setCompleteQty(e.target.value)} />
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Completing this order will add <strong>{completeQty || showComplete.quantity} {showComplete.productId.unit}</strong> of <strong>{showComplete.productId.name}</strong> to stock automatically.
              </p>
              {formError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowComplete(null)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
                <button onClick={handleComplete} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Complete & Add to Stock
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}
