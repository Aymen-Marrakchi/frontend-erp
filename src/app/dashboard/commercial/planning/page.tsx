"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import {
  deliveryPlanService,
  DeliveryPlan,
  CreateDeliveryPlanPayload,
} from "@/services/commercial/deliveryPlanService";
import { SalesOrder } from "@/services/commercial/salesOrderService";
import { carrierService, Carrier } from "@/services/commercial/carrierService";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Loader2,
  Plus,
  X,
  Truck,
  CheckCircle,
  PlayCircle,
  XCircle,
  ChevronDown,
  Package,
  MapPin,
  User,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PLANNED:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    IN_PROGRESS:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    COMPLETED:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    CANCELLED:
      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

const emptyForm: CreateDeliveryPlanPayload = {
  planNo: "",
  planDate: "",
  carrierId: "",
  zone: "",
  driver: "",
  orderIds: [],
  notes: "",
};

export default function PlanningPage() {
  const { t } = useLanguage();

  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [unassigned, setUnassigned] = useState<SalesOrder[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateDeliveryPlanPayload>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [plansData, unassignedData, carriersData] = await Promise.all([
        deliveryPlanService.getAll(),
        deliveryPlanService.getUnassigned(),
        carrierService.getActive(),
      ]);
      setPlans(plansData);
      setUnassigned(unassignedData);
      setCarriers(carriersData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load planning data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const kpis = useMemo(() => ({
    total: plans.length,
    planned: plans.filter((p) => p.status === "PLANNED").length,
    inProgress: plans.filter((p) => p.status === "IN_PROGRESS").length,
    completed: plans.filter((p) => p.status === "COMPLETED").length,
    unassigned: unassigned.length,
  }), [plans, unassigned]);

  const toggleOrder = (orderId: string) => {
    setForm((f) => {
      const ids = f.orderIds || [];
      return {
        ...f,
        orderIds: ids.includes(orderId)
          ? ids.filter((id) => id !== orderId)
          : [...ids, orderId],
      };
    });
  };

  const handleCreate = async () => {
    if (!form.planNo.trim() || !form.planDate) {
      setError("Plan number and date are required");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await deliveryPlanService.create({
        ...form,
        carrierId: form.carrierId || undefined,
      });
      setShowForm(false);
      setForm(emptyForm);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      setActionId(id);
      await deliveryPlanService.start(id);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start delivery");
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      setActionId(id);
      await deliveryPlanService.complete(id);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to complete delivery");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setActionId(id);
      await deliveryPlanService.cancel(id);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel plan");
    } finally {
      setActionId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("commercialModule")} · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <CalendarDays size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("deliveryPlanning") || "Delivery Planning"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("deliveryPlanningSub") || "Schedule and group shipments for delivery runs"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/commercial/shipments"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Truck size={15} />
              {t("shipped") || "Shipments"}
            </Link>
            <button
              onClick={() => { setShowForm(true); setForm(emptyForm); }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <Plus size={15} />
              {t("newPlan") || "New Plan"}
            </button>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: t("totalPlans") || "Total Plans", value: kpis.total, color: "text-slate-900 dark:text-white" },
            { label: t("planned") || "Planned", value: kpis.planned, color: "text-blue-700 dark:text-blue-400" },
            { label: t("inProgress") || "In Progress", value: kpis.inProgress, color: "text-amber-700 dark:text-amber-400" },
            { label: t("completedDeliveries") || "Completed", value: kpis.completed, color: "text-emerald-700 dark:text-emerald-400" },
            { label: t("unassignedOrders") || "Unassigned Orders", value: kpis.unassigned, color: kpis.unassigned > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400" },
          ].map((kpi) => (
            <div key={kpi.label} className={`${surface} px-5 py-4`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {kpi.label}
              </p>
              <p className={`mt-2 text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {/* Unassigned shipped orders */}
          <div className={`${surface} overflow-hidden`}>
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                {t("unassignedOrders") || "Unassigned Orders"}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  {unassigned.length}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {t("unassignedOrdersSub") || "Shipped orders not yet in a delivery plan"}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> {t("loading")}
              </div>
            ) : unassigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-slate-400 dark:text-slate-500">
                <CheckCircle size={28} className="text-emerald-400 opacity-60" />
                {t("allAssigned") || "All shipped orders are assigned"}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {unassigned.map((order) => (
                  <div key={order._id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {order.orderNo}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {order.customerName}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        {order.shippedAt && (
                          <p>{new Date(order.shippedAt).toLocaleDateString("fr-TN")}</p>
                        )}
                        {order.carrierId && (
                          <p className="flex items-center gap-1 justify-end">
                            <Truck size={9} />
                            {order.carrierId?.code}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plans list */}
          <div className="xl:col-span-2 space-y-4">
            {/* New plan form */}
            {showForm && (
              <div className={`${surface} p-6`}>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    {t("newPlan") || "New Delivery Plan"}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("planNo") || "Plan No."} *
                    </label>
                    <input
                      value={form.planNo}
                      onChange={(e) => setForm((f) => ({ ...f, planNo: e.target.value.toUpperCase() }))}
                      placeholder="EX: PLAN-2026-001"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("planDate") || "Delivery Date"} *
                    </label>
                    <input
                      type="date"
                      value={form.planDate}
                      onChange={(e) => setForm((f) => ({ ...f, planDate: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("carrier") || "Carrier"}
                    </label>
                    <select
                      value={form.carrierId || ""}
                      onChange={(e) => setForm((f) => ({ ...f, carrierId: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">— {t("carrier") || "Carrier"} —</option>
                      {carriers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("zone") || "Zone / Region"}
                    </label>
                    <input
                      value={form.zone || ""}
                      onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                      placeholder="Ex: Grand Tunis, Sfax..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("driver") || "Driver"}
                    </label>
                    <input
                      value={form.driver || ""}
                      onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
                      placeholder="Driver name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("notes") || "Notes"}
                    </label>
                    <input
                      value={form.notes || ""}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Order selection */}
                {unassigned.length > 0 && (
                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("selectOrders") || "Select orders to include"}{" "}
                      <span className="text-slate-400">({form.orderIds?.length || 0} selected)</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {unassigned.map((order) => {
                        const selected = (form.orderIds || []).includes(order._id);
                        return (
                          <button
                            key={order._id}
                            type="button"
                            onClick={() => toggleOrder(order._id)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "bg-blue-50 dark:bg-blue-950/30"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {selected && (
                                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-slate-900 dark:text-white">
                                {order.orderNo}
                              </span>
                              <span className="ml-2 text-slate-500 dark:text-slate-400">
                                {order.customerName}
                              </span>
                            </div>
                            {order.carrierId && (
                              <span className="shrink-0 text-[10px] text-slate-400">
                                {order.carrierId?.code}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                  >
                    {saving && <Loader2 size={13} className="animate-spin" />}
                    {t("createPlan") || "Create Plan"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {t("cancel") || "Cancel"}
                  </button>
                </div>
              </div>
            )}

            {/* Plans */}
            {loading ? (
              <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500`}>
                <Loader2 size={16} className="animate-spin" /> {t("loading")}
              </div>
            ) : plans.length === 0 ? (
              <div className={`${surface} flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500`}>
                <CalendarDays size={32} className="opacity-30" />
                {t("noPlans") || "No delivery plans yet"}
              </div>
            ) : (
              plans.map((plan) => {
                const isExpanded = expandedId === plan._id;
                const busy = actionId === plan._id;

                return (
                  <div key={plan._id} className={`${surface} overflow-hidden`}>
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : plan._id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {plan.planNo}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(plan.status)}`}
                          >
                            {plan.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays size={10} />
                            {new Date(plan.planDate).toLocaleDateString("fr-TN")}
                          </span>
                          {plan.zone && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {plan.zone}
                            </span>
                          )}
                          {plan.driver && (
                            <span className="flex items-center gap-1">
                              <User size={10} /> {plan.driver}
                            </span>
                          )}
                          {plan.carrierId && (
                            <span className="flex items-center gap-1">
                              <Truck size={10} /> {plan.carrierId?.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Package size={10} /> {plan.orderIds.length} orders
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {plan.status === "PLANNED" && (
                          <button
                            onClick={() => handleStart(plan._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <PlayCircle size={11} />}
                            {t("startDelivery") || "Start"}
                          </button>
                        )}
                        {plan.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleComplete(plan._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                            {t("completeDelivery") || "Complete"}
                          </button>
                        )}
                        {(plan.status === "PLANNED" || plan.status === "IN_PROGRESS") && (
                          <button
                            onClick={() => handleCancel(plan._id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 px-3 py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:text-rose-400"
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                            {t("cancel") || "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded order list */}
                    {isExpanded && plan.orderIds.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          {t("orders") || "Orders"}
                        </p>
                        <div className="space-y-2">
                          {plan.orderIds.map((order) => {
                            const total = order.lines.reduce(
                              (sum, l) => sum + l.quantity * l.unitPrice,
                              0
                            );
                            return (
                              <div
                                key={order._id}
                                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {order.orderNo}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {order.customerName}
                                  </p>
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                                  </p>
                                  <p>{order.lines.length} line{order.lines.length !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {plan.completedAt && (
                          <p className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400">
                            ✓ Completed {new Date(plan.completedAt).toLocaleDateString("fr-TN")} — all orders marked as delivered
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
