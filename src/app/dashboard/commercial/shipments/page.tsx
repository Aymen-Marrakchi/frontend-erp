"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { carrierService, Carrier } from "@/services/commercial/carrierService";
import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  Loader2,
  Search,
  ChevronDown,
  CheckCircle,
  Package,
  X,
  DollarSign,
  CalendarDays,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PREPARED: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    DELIVERED: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export default function CommercialShipmentsPage() {
  const { t } = useLanguage();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<string, string>>({});
  const [costInputs, setCostInputs] = useState<Record<string, string>>({});

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await salesOrderService.getAll();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    carrierService.getActive().then(setCarriers).catch(() => {});
  }, []);

  const preparedOrders = useMemo(
    () => orders.filter((o) => o.status === "PREPARED"),
    [orders]
  );

  const shippedOrders = useMemo(
    () => orders.filter((o) => o.status === "SHIPPED"),
    [orders]
  );

  const filteredPrepared = useMemo(() => {
    const q = search.toLowerCase();
    return preparedOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
    );
  }, [preparedOrders, search]);

  const filteredShipped = useMemo(() => {
    const q = search.toLowerCase();
    return shippedOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
    );
  }, [shippedOrders, search]);

  const handleShip = async (order: SalesOrder) => {
    try {
      setActionId(order._id);
      setError("");
      await salesOrderService.ship(order._id, {
        trackingNumber: trackingInputs[order._id] || "",
        carrierId: carrierInputs[order._id] || undefined,
        shippingCost: parseFloat(costInputs[order._id] || "0") || 0,
      });
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to ship order");
    } finally {
      setActionId(null);
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.deliver(id);
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to deliver order");
    } finally {
      setActionId(null);
    }
  };

  const orderTotal = (order: SalesOrder) =>
    order.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("commercialModule")} · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Truck size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("shipped") || "Shipments"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage shipment execution and delivery confirmation
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/commercial/planning"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <CalendarDays size={15} />
            {t("deliveryPlanning") || "Delivery Planning"}
          </Link>
        </div>

        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Prepared Orders",
              value: preparedOrders.length,
              color: "text-violet-700 dark:text-violet-400",
            },
            {
              label: "Shipped Orders",
              value: shippedOrders.length,
              color: "text-emerald-700 dark:text-emerald-400",
            },
            {
              label: "Ready to Ship",
              value: filteredPrepared.length,
              color: "text-slate-900 dark:text-white",
            },
            {
              label: "In Transit",
              value: filteredShipped.length,
              color: "text-teal-700 dark:text-teal-400",
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
              Shipping Queue
              <span className="ml-2 text-sm font-normal text-slate-400">
                {filteredPrepared.length}
              </span>
            </h2>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shipment orders"
                className="w-56 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> {t("loading")}
            </div>
          ) : filteredPrepared.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
              <Package size={30} className="opacity-30" />
              No prepared orders waiting for shipment
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPrepared.map((order) => {
                const isExpanded = expandedId === order._id;
                const busy = actionId === order._id;
                const total = orderTotal(order);

                return (
                  <div key={order._id}>
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
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
                            {order.orderNo}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {order.customerName}
                        </p>
                        {order.preparedAt && (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Prepared: {new Date(order.preparedAt).toLocaleDateString("fr-TN")}
                          </p>
                        )}
                      </div>

                      <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                        {/* Carrier selector */}
                        <select
                          value={carrierInputs[order._id] || ""}
                          onChange={(e) =>
                            setCarrierInputs((prev) => ({ ...prev, [order._id]: e.target.value }))
                          }
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="">— Carrier —</option>
                          {carriers.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>

                        {/* Shipping cost */}
                        <div className="relative">
                          <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={costInputs[order._id] || ""}
                            onChange={(e) =>
                              setCostInputs((prev) => ({ ...prev, [order._id]: e.target.value }))
                            }
                            placeholder="Cost (TND)"
                            className="w-32 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          />
                        </div>

                        {/* Tracking number */}
                        <input
                          value={trackingInputs[order._id] || ""}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({
                              ...prev,
                              [order._id]: e.target.value,
                            }))
                          }
                          placeholder="Tracking number"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleShip(order)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <Truck size={11} />}
                          {t("ship")}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                              {["Product", t("quantity"), t("unitPrice"), t("amount")].map((h) => (
                                <th
                                  key={h}
                                  className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {order.lines.map((line, idx) => (
                              <tr key={idx}>
                                <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                                  {line.productId?.name || "—"}
                                  {line.productId?.sku && (
                                    <span className="ml-1.5 text-[11px] text-slate-400">
                                      ({line.productId.sku})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                  {line.quantity}
                                </td>
                                <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                  {line.unitPrice.toLocaleString("fr-TN", {
                                    minimumFractionDigits: 2,
                                  })}{" "}
                                  TND
                                </td>
                                <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                                  {(line.quantity * line.unitPrice).toLocaleString("fr-TN", {
                                    minimumFractionDigits: 2,
                                  })}{" "}
                                  TND
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Orders in Transit
              <span className="ml-2 text-sm font-normal text-slate-400">
                {filteredShipped.length}
              </span>
            </h2>
          </div>

          {loading ? null : filteredShipped.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-sm text-slate-400 dark:text-slate-500">
              <Truck size={28} className="opacity-30" />
              No shipped orders awaiting delivery confirmation
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredShipped.map((order) => {
                const busy = actionId === order._id;
                const total = orderTotal(order);

                return (
                  <div
                    key={order._id}
                    className="flex flex-wrap items-center gap-4 px-6 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {order.orderNo}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {order.customerName}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-slate-400">
                        {order.shippedAt && (
                          <span>
                            Shipped: {new Date(order.shippedAt).toLocaleDateString("fr-TN")}
                          </span>
                        )}
                        {order.trackingNumber && <span>Tracking: {order.trackingNumber}</span>}
                        {order.carrierId && (
                          <span className="flex items-center gap-1">
                            <Truck size={10} />
                            {order.carrierId.name} ({order.carrierId.code})
                          </span>
                        )}
                        {order.shippingCost !== undefined && order.shippingCost > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign size={10} />
                            {order.shippingCost.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeliver(order._id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
                    >
                      {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                      {t("delivered") || "Deliver"}
                    </button>
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