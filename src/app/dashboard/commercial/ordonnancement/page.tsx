"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock,
  Factory,
  Loader2,
  Package,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { stockItemService } from "@/services/stock/stockItemService";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

interface StockItem {
  _id: string;
  productId: {
    _id: string;
    sku: string;
    name: string;
    type?: string;
    unit: string;
  };
  quantityOnHand: number;
  quantityReserved: number;
}

interface ProductGroup {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  available: number;
  totalDemand: number;
  totalAllocated: number;
  orderCount: number;
}

interface OrderRisk {
  orderId: string;
  missingDates: boolean;
  invalidDateRange: boolean;
  planningRisk: boolean;
  urgentShortage: boolean;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response !== null
  ) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function AllocationMeter({
  allocated,
  ordered,
  color,
}: {
  allocated: number;
  ordered: number;
  color: string;
}) {
  const width = ordered > 0 ? Math.min(100, Math.round((allocated / ordered) * 100)) : 0;

  return (
    <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function clampAllocation(value: number, maxAllowed: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maxAllowed, value));
}

function getOrderedDrafts(orders: SalesOrder[], focusOrderId: string | null) {
  const sorted = [...orders];
  sorted.sort((a, b) => {
    if (!!a.isUrgent !== !!b.isUrgent) {
      return a.isUrgent ? -1 : 1;
    }
    if (focusOrderId === a._id) return -1;
    if (focusOrderId === b._id) return 1;
    return (new Date(a.createdAt || 0).getTime() || 0) - (new Date(b.createdAt || 0).getTime() || 0);
  });
  return sorted;
}

function buildSuggestedAllocations(
  orders: SalesOrder[],
  availableByProduct: Map<string, number>,
  focusOrderId: string | null
) {
  const remainingByProduct = new Map(availableByProduct);
  const next: Record<string, Record<string, string>> = {};

  for (const order of getOrderedDrafts(orders, focusOrderId)) {
    next[order._id] = {};
    for (const line of order.lines) {
      const productId = line.productId?._id;
      if (!productId) continue;
      const remaining = remainingByProduct.get(productId) || 0;
      const allocated = Math.min(line.quantity, remaining);
      next[order._id][productId] = String(allocated);
      remainingByProduct.set(productId, Math.max(0, remaining - allocated));
    }
  }

  return next;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daySpan(start: Date, end: Date) {
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function buildSuggestedDates(orders: SalesOrder[]) {
  const next: Record<string, { plannedStartDate: string; plannedEndDate: string }> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const order of orders) {
    const currentStart = order.plannedStartDate ? new Date(order.plannedStartDate) : today;
    const currentEnd = order.plannedEndDate ? new Date(order.plannedEndDate) : addDays(currentStart, 2);
    const duration = daySpan(currentStart, currentEnd);

    let start = currentStart < today ? today : currentStart;
    let end = addDays(start, duration);

    if (order.promisedDate) {
      const promised = new Date(order.promisedDate);
      promised.setHours(0, 0, 0, 0);
      if (!Number.isNaN(promised.getTime()) && end > promised) {
        end = promised;
        start = addDays(promised, -duration);
        if (start < today) {
          start = today;
        }
      }
    }

    next[order._id] = {
      plannedStartDate: toDateInputValue(start),
      plannedEndDate: toDateInputValue(end),
    };
  }
  return next;
}

function buildSuggestedDatesForOrder(order: SalesOrder) {
  return buildSuggestedDates([order])[order._id];
}

function getGroupedByProduct(
  orders: SalesOrder[],
  stockMap: Map<string, number>,
  allocations: Record<string, Record<string, string>>
) {
  const groups = new Map<string, ProductGroup>();

  for (const order of orders) {
    for (const line of order.lines) {
      if (!line.productId?._id) continue;
      const productId = String(line.productId._id);
      const current = groups.get(productId) || {
        productId,
        name: line.productId.name,
        sku: line.productId.sku,
        unit: line.productId.unit || "",
        available: stockMap.get(productId) || 0,
        totalDemand: 0,
        totalAllocated: 0,
        orderCount: 0,
      };
      current.totalDemand += line.quantity;
      current.totalAllocated += Math.max(0, Number(allocations[order._id]?.[productId] || 0));
      current.orderCount += 1;
      groups.set(productId, current);
    }
  }

  return Array.from(groups.values());
}

function getOrderRisk(
  order: SalesOrder,
  allocations: Record<string, Record<string, string>>,
  plannedDates: Record<string, { plannedStartDate: string; plannedEndDate: string }>
): OrderRisk {
  const start = plannedDates[order._id]?.plannedStartDate || "";
  const end = plannedDates[order._id]?.plannedEndDate || "";
  const missingDates = !start || !end;
  const invalidDateRange = !missingDates && new Date(end) < new Date(start);
  const planningRisk =
    !missingDates &&
    !!order.promisedDate &&
    new Date(end) > new Date(order.promisedDate);
  const urgentShortage =
    !!order.isUrgent &&
    order.lines.some((line) => {
      const productId = line.productId?._id;
      const allocated = productId ? Number(allocations[order._id]?.[productId] || 0) : 0;
      return allocated < line.quantity;
    });

  return {
    orderId: order._id,
    missingDates,
    invalidDateRange,
    planningRisk,
    urgentShortage,
  };
}

export default function OrdonnancementPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const focusOrderId = searchParams.get("order");

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingBoard, setSavingBoard] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, Record<string, string>>>({});
  const [plannedDates, setPlannedDates] = useState<
    Record<string, { plannedStartDate: string; plannedEndDate: string }>
  >({});

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [ordersData, stockData] = await Promise.all([
        salesOrderService.getAll(),
        stockItemService.getAll(),
      ]);

      const draftOrders = Array.isArray(ordersData)
        ? ordersData
            .filter((order: SalesOrder) => order.status === "DRAFT")
            .map((order: SalesOrder) => ({
              ...order,
              lines: order.lines.filter((line) => line.productId?.type === "PRODUIT_FINI"),
            }))
            .filter((order: SalesOrder) => order.lines.length > 0)
        : [];
      const items = Array.isArray(stockData)
        ? stockData.filter((item: StockItem) => item.productId?.type === "PRODUIT_FINI")
        : [];
      const availableByProduct = new Map(
        items.map((item: StockItem) => [
          String(item.productId._id),
          Math.max(0, (item.quantityOnHand || 0) - (item.quantityReserved || 0)),
        ])
      );

      setOrders(draftOrders);
      setStockItems(items);
      setAllocations(buildSuggestedAllocations(draftOrders, availableByProduct, focusOrderId));
      setPlannedDates(buildSuggestedDates(draftOrders));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load ordonnancement page"));
    } finally {
      setLoading(false);
    }
  }, [focusOrderId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stockMap = useMemo(
    () =>
      new Map(
        stockItems.map((item) => [
          String(item.productId._id),
          Math.max(0, (item.quantityOnHand || 0) - (item.quantityReserved || 0)),
        ])
      ),
    [stockItems]
  );

  const orderedDrafts = useMemo(() => getOrderedDrafts(orders, focusOrderId), [orders, focusOrderId]);

  const groupedByProduct = useMemo(
    () => getGroupedByProduct(orderedDrafts, stockMap, allocations),
    [allocations, orderedDrafts, stockMap]
  );

  const groupedByProductMap = useMemo(
    () => new Map(groupedByProduct.map((group) => [group.productId, group])),
    [groupedByProduct]
  );

  const availableByProduct = useMemo(
    () =>
      new Map(
        stockItems.map((item) => [
          String(item.productId._id),
          Math.max(0, (item.quantityOnHand || 0) - (item.quantityReserved || 0)),
        ])
      ),
    [stockItems]
  );

  const overAllocatedProducts = useMemo(
    () => groupedByProduct.filter((group) => group.totalAllocated > group.available),
    [groupedByProduct]
  );

  const orderRisks = useMemo(
    () => orderedDrafts.map((order) => getOrderRisk(order, allocations, plannedDates)),
    [allocations, orderedDrafts, plannedDates]
  );

  const blockingRisks = useMemo(
    () => orderRisks.filter((risk) => risk.missingDates || risk.invalidDateRange || risk.urgentShortage),
    [orderRisks]
  );

  const setLineAllocation = (orderId: string, productId: string, quantity: number, maxAllowed: number) => {
    setAllocations((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [productId]: String(clampAllocation(quantity, maxAllowed)),
      },
    }));
  };

  const applyBoardSuggestions = () => {
    setAllocations(buildSuggestedAllocations(orderedDrafts, availableByProduct, focusOrderId));
    setPlannedDates(buildSuggestedDates(orderedDrafts));
    setError("");
  };

  const applyOrderDateSuggestion = (order: SalesOrder) => {
    const suggestion = buildSuggestedDatesForOrder(order);
    if (!suggestion) return;
    setPlannedDates((prev) => ({
      ...prev,
      [order._id]: suggestion,
    }));
  };

  const saveBoard = async () => {
    try {
      if (overAllocatedProducts.length > 0) {
        setError("One or more products are over-allocated. Reduce stock allocation before saving.");
        return;
      }
      if (blockingRisks.length > 0) {
        setError("Resolve ordonnancement conflicts before saving the board.");
        return;
      }

      setSavingBoard(true);
      await salesOrderService.ordonanceBulk({
        orders: orderedDrafts.map((order) => ({
          orderId: order._id,
          plannedStartDate: plannedDates[order._id]?.plannedStartDate || toDateInputValue(new Date()),
          plannedEndDate: plannedDates[order._id]?.plannedEndDate || toDateInputValue(addDays(new Date(), 2)),
          lines: order.lines
            .filter((line) => line.productId?._id)
            .map((line) => ({
              productId: line.productId!._id,
              allocatedQuantity: Number(allocations[order._id]?.[line.productId!._id] || 0),
            })),
        })),
      });
      await fetchAll();
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, "Failed to save ordonnancement"));
    } finally {
      setSavingBoard(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Commercial · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
                <Sparkles size={18} className="text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Ordonnancement
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Allocate one shared stock pool across draft finished-product orders before confirmation.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/commercial/orders"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowRight size={14} /> Orders
            </Link>
            <button
              onClick={applyBoardSuggestions}
              disabled={orderedDrafts.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
            >
              <Sparkles size={14} />
              Apply Suggestions
            </button>
            <button
              onClick={saveBoard}
              disabled={
                savingBoard ||
                orderedDrafts.length === 0 ||
                overAllocatedProducts.length > 0 ||
                blockingRisks.length > 0
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {savingBoard ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Save Board
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

        {!loading && overAllocatedProducts.length > 0 && (
          <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              Shared stock is over-allocated for: {overAllocatedProducts.map((group) => group.name).join(", ")}.
              Reduce allocation before saving the board, or use Apply Suggestions to rebalance it automatically.
            </div>
          </div>
        )}

        {!loading && blockingRisks.length > 0 && (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              Some orders still have blocking conflicts:
              {" "}
              {blockingRisks.map((risk) => orders.find((order) => order._id === risk.orderId)?.orderNo || risk.orderId).join(", ")}.
              Check missing dates, invalid ranges, or urgent shortages before saving, or use Apply Suggestions to restore a valid baseline.
            </div>
          </div>
        )}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-20 text-sm text-slate-400`}>
            <Loader2 size={18} className="animate-spin" /> Loading ordonnancement...
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              {groupedByProduct.map((group) => {
                const shortage = Math.max(0, group.totalDemand - group.totalAllocated);
                const overAllocated = group.totalAllocated > group.available;
                return (
                  <div key={group.productId} className={`${surface} p-5`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{group.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {group.sku} · {group.orderCount} draft order{group.orderCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Boxes size={16} className="text-slate-400" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <MetricCard label="Available" value={`${group.available} ${group.unit}`} />
                      <MetricCard
                        label="Allocated"
                        value={`${group.totalAllocated} ${group.unit}`}
                        danger={overAllocated}
                      />
                      <MetricCard
                        label="Production"
                        value={`${shortage} ${group.unit}`}
                        danger={shortage > 0}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {orderedDrafts.length === 0 ? (
              <div className={`${surface} py-20 text-center text-sm text-slate-400`}>
                No draft orders need ordonnancement.
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {orderedDrafts.map((order) => (
                  (() => {
                    const risk = orderRisks.find((entry) => entry.orderId === order._id);
                    return (
                  <div
                    key={order._id}
                    className={`${surface} overflow-hidden ${
                      focusOrderId === order._id ? "ring-2 ring-amber-300 dark:ring-amber-700" : ""
                    } ${order.isUrgent ? "border-orange-300 dark:border-orange-700" : ""}`}
                  >
                    <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-950 dark:text-white">{order.orderNo}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{order.customerName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.source === "RECURRING" && (
                            <div className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                              {t("recurringLabel")}
                            </div>
                          )}
                          {risk?.planningRisk && (
                            <div className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              {t("planningRiskLabel")}
                            </div>
                          )}
                          {risk?.urgentShortage && (
                            <div className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              {t("urgentShortageLabel")}
                            </div>
                          )}
                          {order.isUrgent && (
                            <div className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                              <Zap size={12} className="mr-1 inline-block" />
                              {t("urgentLabel")}
                            </div>
                          )}
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Clock size={12} className="mr-1 inline-block" />
                            {t("draftLabel")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-6">
                      {risk && (risk.missingDates || risk.invalidDateRange || risk.urgentShortage || risk.planningRisk) && (
                        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                          <div className="font-medium">{t("planningChecks")}</div>
                          <div className="mt-1 text-xs">
                            {risk.missingDates && <div>{t("plannedDatesRequired")}</div>}
                            {risk.invalidDateRange && <div>{t("plannedEndAfterStart")}</div>}
                            {risk.planningRisk && <div>{t("plannedEndLaterThanPromised")}</div>}
                            {risk.urgentShortage && <div>{t("urgentOrderNotFullyAllocated")}</div>}
                            {risk.planningRisk && (
                              <div className="mt-1 text-amber-700 dark:text-amber-300">
                                {t("suggestedAlternativeDates")}
                              </div>
                            )}
                            {risk.urgentShortage && (
                              <div className="mt-1 text-amber-700 dark:text-amber-300">
                                {t("suggestedAlternativeUrgent")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {order.lines.map((line, index) => {
                        if (!line.productId?._id) {
                          return (
                            <div
                              key={`missing-${index}`}
                              className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                            >
                              {t("missingProductOrdonnancement")}
                            </div>
                          );
                        }

                        const productId = String(line.productId._id);
                        const allocated = Math.max(0, Number(allocations[order._id]?.[productId] || 0));
                        const production = Math.max(0, line.quantity - allocated);
                        const group = groupedByProductMap.get(productId);
                        const available = group?.available || 0;
                        const totalAllocatedForProduct = group?.totalAllocated || 0;
                        const remainingSharedStock = Math.max(0, available - (totalAllocatedForProduct - allocated));
                        const maxAllowed = Math.min(line.quantity, remainingSharedStock);

                        return (
                          <div
                            key={`${productId}-${index}`}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-slate-950 dark:text-white">{line.productId.name}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{line.productId.sku}</p>
                              </div>
                              <div className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                                {t("sharedAvailable")}: {remainingSharedStock} {line.productId.unit}
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
                              <div>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                  <span>{t("servedFromStock")}</span>
                                  <span>
                                    {allocated} / {line.quantity}
                                  </span>
                                </div>
                                <AllocationMeter allocated={allocated} ordered={line.quantity} color="bg-emerald-500" />
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                  <span>{t("plannedProduction")}</span>
                                  <span>{production}</span>
                                </div>
                                <AllocationMeter allocated={production} ordered={line.quantity} color="bg-amber-500" />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  {t("allocatedQty")}
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={maxAllowed}
                                  value={allocated}
                                  onChange={(event) =>
                                    setLineAllocation(order._id, productId, Number(event.target.value), maxAllowed)
                                  }
                                  className="w-full accent-amber-500"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={maxAllowed}
                                  value={allocations[order._id]?.[productId] ?? "0"}
                                  onChange={(event) =>
                                    setLineAllocation(order._id, productId, Number(event.target.value), maxAllowed)
                                  }
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                                />
                                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                  {t("maxAllocatableNow")}: {maxAllowed} {line.productId.unit}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("plannedDatesTitle")}</p>
                          <div className="flex items-center gap-2">
                            {(risk?.missingDates || risk?.invalidDateRange || risk?.planningRisk) && (
                              <button
                                type="button"
                                onClick={() => applyOrderDateSuggestion(order)}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                              >
                                {t("useSuggestion")}
                              </button>
                            )}
                            {risk?.planningRisk && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                {t("planningRiskLabel")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("plannedStart")}
                            </label>
                            <input
                              type="date"
                              value={plannedDates[order._id]?.plannedStartDate || ""}
                              onChange={(event) =>
                                setPlannedDates((prev) => ({
                                  ...prev,
                                  [order._id]: {
                                    plannedStartDate: event.target.value,
                                    plannedEndDate: prev[order._id]?.plannedEndDate || event.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {t("plannedEnd")}
                            </label>
                            <input
                              type="date"
                              value={plannedDates[order._id]?.plannedEndDate || ""}
                              onChange={(event) =>
                                setPlannedDates((prev) => ({
                                  ...prev,
                                  [order._id]: {
                                    plannedStartDate: prev[order._id]?.plannedStartDate || event.target.value,
                                    plannedEndDate: event.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Package size={12} /> Ordered {order.lines.reduce((sum, line) => sum + line.quantity, 0)}
                        </span>
                        <span className="ml-4 inline-flex items-center gap-1">
                          <Factory size={12} /> Planned production{" "}
                          {order.lines.reduce((sum, line) => {
                            const productId = line.productId?._id;
                            const allocated = productId ? Number(allocations[order._id]?.[productId] || 0) : 0;
                            return sum + Math.max(0, line.quantity - allocated);
                          }, 0)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Save is done globally for the whole ordonnancement board.
                      </div>
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p
        className={`mt-2 text-lg font-bold ${
          danger ? "text-amber-600 dark:text-amber-400" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
