"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState, useMemo } from "react";
import { productionOrderService, ProductionOrder } from "@/services/production/productionOrderService";
import { cyclicOrderService, CyclicOrder } from "@/services/production/cyclicOrderService";
import { deliveryPlanService, DeliveryPlan } from "@/services/commercial/deliveryPlanService";
import { workCenterService, WorkCenter } from "@/services/production/workCenterService";
import {
  Factory, CalendarDays, RefreshCw, Truck, Package,
  Loader2, X, ChevronDown, PlayCircle, CheckCircle,
  AlertCircle, Clock, RotateCcw, Settings,
} from "lucide-react";
import Link from "next/link";

const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  HIGH:   "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  NORMAL: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  LOW:    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:       "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  SCHEDULED:   "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  COMPLETED:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  CANCELLED:   "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
};

function CapacityBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
        <span>{used} / {total} colis</span>
        <span className={pct > 90 ? "text-red-500 font-semibold" : ""}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PRIO_RANK: Record<string, number> = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

function derivePriority(order: { isUrgent?: boolean; promisedDate?: string }, planDate: string): string {
  if (order.isUrgent) return "URGENT";
  if (order.promisedDate) {
    const days = (new Date(order.promisedDate).getTime() - new Date(planDate).getTime()) / 86400000;
    if (days <= 3) return "HIGH";
  }
  return "NORMAL";
}

type Tab = "plans" | "cyclics" | "orders";

export default function ProductionPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("plans");

  const [plans, setPlans] = useState<DeliveryPlan[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [cyclics, setCyclics] = useState<CyclicOrder[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [generatingPlanId, setGeneratingPlanId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<Record<string, number>>({});

  const [firingId, setFiringId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{
    orderId: string; workCenterId: string; scheduledStart: string; scheduledEnd: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [plansData, ordersData, cyclicsData, wcData] = await Promise.all([
        deliveryPlanService.getAll(),
        productionOrderService.getAll(),
        cyclicOrderService.getDue(),
        workCenterService.getActive(),
      ]);
      setPlans(plansData);
      setOrders(ordersData);
      setCyclics(cyclicsData);
      setWorkCenters(wcData);
    } catch {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const shipmentPlans = useMemo(
    () => plans.filter((p) => p.planType === "SHIPMENT" && p.status !== "CANCELLED" && p.status !== "COMPLETED"),
    [plans]
  );

  const kpis = useMemo(() => ({
    total:      orders.length,
    draft:      orders.filter((o) => o.status === "DRAFT").length,
    scheduled:  orders.filter((o) => o.status === "SCHEDULED").length,
    inProgress: orders.filter((o) => o.status === "IN_PROGRESS").length,
    completed:  orders.filter((o) => o.status === "COMPLETED").length,
  }), [orders]);

  function planTotalQty(plan: DeliveryPlan) {
    return plan.orderIds.reduce((sum, o) => sum + o.lines.reduce((s, l) => s + l.quantity, 0), 0);
  }

  const handleGenerate = async (planId: string) => {
    try {
      setGeneratingPlanId(planId);
      setError("");
      const result = await productionOrderService.createFromDeliveryPlan(planId);
      setGeneratedResult((prev) => ({ ...prev, [planId]: result.orders.length }));
      setTab("orders");
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur lors de la génération");
    } finally {
      setGeneratingPlanId(null);
    }
  };

  const handleFire = async (cyclicId: string) => {
    try {
      setFiringId(cyclicId);
      setError("");
      await cyclicOrderService.fire(cyclicId);
      setTab("orders");
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur");
    } finally {
      setFiringId(null);
    }
  };

  const handleStart = async (id: string) => {
    try { setActionId(id); await productionOrderService.start(id); await fetchAll(); }
    catch (e: any) { setError(e?.response?.data?.message || "Erreur"); }
    finally { setActionId(null); }
  };

  const handleComplete = async (id: string) => {
    try { setActionId(id); await productionOrderService.complete(id); await fetchAll(); }
    catch (e: any) { setError(e?.response?.data?.message || "Erreur"); }
    finally { setActionId(null); }
  };

  const handleCancel = async (id: string) => {
    try { setActionId(id); await productionOrderService.cancel(id); await fetchAll(); }
    catch (e: any) { setError(e?.response?.data?.message || "Erreur"); }
    finally { setActionId(null); }
  };

  const handleSchedule = async () => {
    if (!scheduleForm) return;
    try {
      setActionId(scheduleForm.orderId);
      await productionOrderService.schedule(scheduleForm.orderId, {
        workCenterId: scheduleForm.workCenterId,
        scheduledStart: scheduleForm.scheduledStart,
        scheduledEnd: scheduleForm.scheduledEnd,
      });
      setScheduleForm(null);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur");
    } finally {
      setActionId(null);
    }
  };

  const filteredOrders = useMemo(
    () => statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter]
  );

  const dueSoon = cyclics.filter((c) => new Date(c.nextDueDate) <= new Date());
  const upcoming = cyclics.filter((c) => new Date(c.nextDueDate) > new Date());

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Production · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Factory size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Planification Production
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Basé sur les plans de livraison, priorités et capacité véhicule
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/production/cyclic-orders"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw size={14} /> Gérer Cycliques
            </Link>
            <Link
              href="/dashboard/production/work-centers"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Settings size={14} /> Centres
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70"><X size={14} /></button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: "Total", value: kpis.total, color: "text-slate-900 dark:text-white" },
            { label: "Brouillon", value: kpis.draft, color: "text-slate-500" },
            { label: "Planifié", value: kpis.scheduled, color: "text-blue-700 dark:text-blue-400" },
            { label: "En cours", value: kpis.inProgress, color: "text-amber-700 dark:text-amber-400" },
            { label: "Terminé", value: kpis.completed, color: "text-emerald-700 dark:text-emerald-400" },
          ].map((k) => (
            <div key={k.label} className={`${surface} px-5 py-4`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{k.label}</p>
              <p className={`mt-2 text-3xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          {([
            { id: "plans" as Tab,  label: "Plans de Livraison", badge: shipmentPlans.length },
            { id: "cyclics" as Tab, label: "Cycliques",          badge: dueSoon.length },
            { id: "orders" as Tab,  label: "Ordres de Production", badge: kpis.inProgress },
          ]).map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition ${
                tab === tb.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {tb.label}
              {tb.badge > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {tb.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-20 text-sm text-slate-400`}>
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <>
            {/* ── TAB: Plans de Livraison ── */}
            {tab === "plans" && (
              <div className="space-y-4">
                {shipmentPlans.length === 0 ? (
                  <div className={`${surface} flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400`}>
                    <Truck size={32} className="opacity-30" />
                    <p>Aucun plan de livraison actif</p>
                    <Link href="/dashboard/commercial/planning" className="text-xs text-slate-400 underline hover:text-slate-600">
                      Créer un plan →
                    </Link>
                  </div>
                ) : (
                  shipmentPlans.map((plan) => {
                    const totalQty = planTotalQty(plan);
                    const vehicleCap = plan.vehicleId?.capacityPackets ?? 0;
                    const isExpanded = expandedPlanId === plan._id;
                    const isGenerating = generatingPlanId === plan._id;
                    const generated = generatedResult[plan._id];
                    const urgentCount = plan.orderIds.filter((o) => derivePriority(o as any, plan.planDate) === "URGENT").length;
                    const highCount   = plan.orderIds.filter((o) => derivePriority(o as any, plan.planDate) === "HIGH").length;
                    const overCapacity = vehicleCap > 0 && totalQty > vehicleCap;

                    return (
                      <div key={plan._id} className={`${surface} overflow-hidden`}>
                        <div className="flex flex-wrap items-start gap-4 p-5">
                          <button
                            onClick={() => setExpandedPlanId(isExpanded ? null : plan._id)}
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">{plan.planNo}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                plan.status === "PLANNED"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              }`}>{plan.status}</span>
                              {urgentCount > 0 && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  {urgentCount} URGENT
                                </span>
                              )}
                              {highCount > 0 && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  {highCount} HIGH
                                </span>
                              )}
                              {overCapacity && (
                                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  <AlertCircle size={9} /> Dépasse capacité
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={10} /> {new Date(plan.planDate).toLocaleDateString("fr-TN")}
                              </span>
                              {plan.zone && <span>📍 {plan.zone}</span>}
                              {plan.carrierId && (
                                <span className="flex items-center gap-1"><Truck size={10} /> {plan.carrierId.name}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Package size={10} /> {plan.orderIds.length} cmds · {totalQty} unités
                              </span>
                            </div>

                            {plan.vehicleId && (
                              <div className="mt-2 max-w-xs">
                                <p className="text-[10px] text-slate-400">
                                  Véhicule: {plan.vehicleId.matricule} · capacité {vehicleCap} colis
                                </p>
                                <CapacityBar used={totalQty} total={vehicleCap} />
                              </div>
                            )}

                            {generated !== undefined && (
                              <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                                ✓ {generated} ordre{generated !== 1 ? "s" : ""} de production générés → onglet Ordres
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleGenerate(plan._id)}
                            disabled={isGenerating || overCapacity}
                            title={overCapacity ? "Quantité totale dépasse la capacité du véhicule" : ""}
                            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                          >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Factory size={12} />}
                            Générer Production
                          </button>
                        </div>

                        {/* Expanded orders */}
                        {isExpanded && plan.orderIds.length > 0 && (
                          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Commandes — triées par priorité
                            </p>
                            <div className="space-y-2">
                              {[...plan.orderIds]
                                .sort((a, b) =>
                                  (PRIO_RANK[derivePriority(b as any, plan.planDate)] ?? 0) -
                                  (PRIO_RANK[derivePriority(a as any, plan.planDate)] ?? 0)
                                )
                                .map((order) => {
                                  const priority = derivePriority(order as any, plan.planDate);
                                  const qty = order.lines.reduce((s, l) => s + l.quantity, 0);
                                  return (
                                    <div
                                      key={order._id}
                                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium text-slate-900 dark:text-white">{order.orderNo}</p>
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLOR[priority]}`}>
                                            {priority}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-500">{order.customerName}</p>
                                      </div>
                                      <p className="text-xs font-medium text-slate-900 dark:text-white">{qty} unités</p>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── TAB: Cycliques ── */}
            {tab === "cyclics" && (
              <div className="space-y-4">
                {cyclics.length === 0 ? (
                  <div className={`${surface} flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400`}>
                    <RotateCcw size={32} className="opacity-30" />
                    <p>Aucune commande cyclique dans les 14 prochains jours</p>
                    <Link href="/dashboard/production/cyclic-orders" className="text-xs text-slate-400 underline hover:text-slate-600">
                      Gérer les cycliques →
                    </Link>
                  </div>
                ) : (
                  <>
                    {dueSoon.length > 0 && (
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">
                          En retard / À déclencher ({dueSoon.length})
                        </p>
                        <div className="space-y-3">
                          {dueSoon.map((c) => (
                            <CyclicCard key={c._id} cyclic={c} isFiring={firingId === c._id} onFire={() => handleFire(c._id)} overdue />
                          ))}
                        </div>
                      </div>
                    )}
                    {upcoming.length > 0 && (
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">
                          Prochainement ({upcoming.length})
                        </p>
                        <div className="space-y-3">
                          {upcoming.map((c) => (
                            <CyclicCard key={c._id} cyclic={c} isFiring={firingId === c._id} onFire={() => handleFire(c._id)} overdue={false} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Link
                        href="/dashboard/production/cyclic-orders"
                        className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Gérer toutes les commandes cycliques →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB: Ordres de Production ── */}
            {tab === "orders" && (
              <div className={`${surface} overflow-hidden`}>
                <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  {["ALL", "DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        statusFilter === s
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {s === "ALL" ? "Tous" : s.replace("_", " ")}
                    </button>
                  ))}
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400">
                    <Factory size={28} className="opacity-30" />
                    Aucun ordre
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.map((order) => (
                      <div key={order._id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{order.orderNo}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[order.status]}`}>
                              {order.status.replace("_", " ")}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLOR[order.priority]}`}>
                              {order.priority}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {order.productId.name} · {order.quantity} {order.productId.unit}
                            {order.workCenterId ? ` · ${order.workCenterId.name}` : ""}
                            {order.scheduledStart ? ` · Prévu ${new Date(order.scheduledStart).toLocaleDateString("fr-TN")}` : ""}
                          </p>
                          {order.notes && (
                            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">{order.notes}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {order.status === "DRAFT" && (
                            <button
                              onClick={() => setScheduleForm({ orderId: order._id, workCenterId: "", scheduledStart: "", scheduledEnd: "" })}
                              className="inline-flex items-center gap-1 rounded-2xl border border-blue-200 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-400"
                            >
                              <CalendarDays size={11} /> Planifier
                            </button>
                          )}
                          {order.status === "SCHEDULED" && (
                            <button
                              onClick={() => handleStart(order._id)}
                              disabled={actionId === order._id}
                              className="inline-flex items-center gap-1 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              {actionId === order._id ? <Loader2 size={11} className="animate-spin" /> : <PlayCircle size={11} />}
                              Démarrer
                            </button>
                          )}
                          {order.status === "IN_PROGRESS" && (
                            <button
                              onClick={() => handleComplete(order._id)}
                              disabled={actionId === order._id}
                              className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {actionId === order._id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                              Terminer
                            </button>
                          )}
                          {["DRAFT", "SCHEDULED", "IN_PROGRESS"].includes(order.status) && (
                            <button
                              onClick={() => handleCancel(order._id)}
                              disabled={actionId === order._id}
                              className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:text-rose-400"
                            >
                              <X size={11} /> Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Schedule modal */}
        {scheduleForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">Planifier l&apos;ordre</h2>
                <button onClick={() => setScheduleForm(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Centre de travail</label>
                  <select
                    value={scheduleForm.workCenterId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, workCenterId: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">— Sélectionner —</option>
                    {workCenters.map((wc) => <option key={wc._id} value={wc._id}>{wc.name} ({wc.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Date début</label>
                  <input type="date" value={scheduleForm.scheduledStart}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledStart: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Date fin</label>
                  <input type="date" value={scheduleForm.scheduledEnd}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledEnd: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button onClick={() => setScheduleForm(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                  Annuler
                </button>
                <button onClick={handleSchedule} disabled={!!actionId}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950">
                  {actionId ? <Loader2 size={13} className="animate-spin" /> : null}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}

function CyclicCard({
  cyclic, isFiring, onFire, overdue,
}: {
  cyclic: CyclicOrder; isFiring: boolean; onFire: () => void; overdue: boolean;
}) {
  const daysUntil = Math.ceil((new Date(cyclic.nextDueDate).getTime() - Date.now()) / 86400000);
  return (
    <div className={`rounded-3xl border p-4 ${
      overdue
        ? "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20"
        : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">{cyclic.customerName}</p>
            {overdue ? (
              <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle size={9} /> En retard
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Clock size={9} /> Dans {daysUntil} j
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">{cyclic.productId.name}</span> · {cyclic.quantity} {cyclic.productId.unit}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Tous les {cyclic.frequencyDays} jours · Prochain: {new Date(cyclic.nextDueDate).toLocaleDateString("fr-TN")}
            {cyclic.lastFiredAt && ` · Dernier: ${new Date(cyclic.lastFiredAt).toLocaleDateString("fr-TN")}`}
          </p>
        </div>
        <button
          onClick={onFire}
          disabled={isFiring}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
        >
          {isFiring ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Déclencher
        </button>
      </div>
    </div>
  );
}
