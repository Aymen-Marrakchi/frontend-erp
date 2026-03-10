"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { salesOrderService } from "@/services/commercial/salesOrderService";
import { stockProductService } from "@/services/stock/stockProductService";
import { useEffect, useState, useMemo } from "react";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  X,
  Search,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  ChevronDown,
} from "lucide-react";

interface Product {
  _id: string;
  sku: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

interface OrderLine {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface Order {
  _id: string;
  orderNo: string;
  customerName: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED" | "SHIPPED";
  notes?: string;
  createdAt?: string;
  lines: {
    productId: Product;
    quantity: number;
    unitPrice: number;
  }[];
}

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    CANCELLED: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "CONFIRMED") return <CheckCircle size={12} className="text-blue-500" />;
  if (status === "SHIPPED") return <Truck size={12} className="text-emerald-500" />;
  if (status === "CANCELLED") return <XCircle size={12} className="text-rose-500" />;
  return <Package size={12} className="text-slate-400" />;
}

export default function CommercialOrdersPage() {
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({ orderNo: "", customerName: "", notes: "" });
  const [lines, setLines] = useState<OrderLine[]>([
    { productId: "", quantity: "", unitPrice: "" },
  ]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [productData, orderData] = await Promise.all([
        stockProductService.getAll(),
        salesOrderService.getAll(),
      ]);
      setProducts(productData.filter((p: Product) => p.status === "ACTIVE"));
      setOrders(orderData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, key: keyof OrderLine, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { productId: "", quantity: "", unitPrice: "" }]);
  };

  const handleCreate = async () => {
    if (!form.orderNo || !form.customerName) {
      setError("Order number and customer name are required");
      return;
    }
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setError("At least one valid line is required");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await salesOrderService.create({
        orderNo: form.orderNo,
        customerName: form.customerName,
        notes: form.notes,
        lines: validLines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice) || 0,
        })),
      });
      setForm({ orderNo: "", customerName: "", notes: "" });
      setLines([{ productId: "", quantity: "", unitPrice: "" }]);
      setShowForm(false);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action: "confirm" | "cancel" | "ship", id: string) => {
    try {
      setActionId(id);
      setError("");
      if (action === "confirm") await salesOrderService.confirm(id);
      if (action === "cancel") await salesOrderService.cancel(id);
      if (action === "ship") await salesOrderService.ship(id);
      await fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action} order`);
    } finally {
      setActionId(null);
    }
  };

  const orderTotal = (order: Order) =>
    order.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  // KPI counts
  const kpis = useMemo(() => ({
    total: orders.length,
    confirmed: orders.filter((o) => o.status === "CONFIRMED").length,
    shipped: orders.filter((o) => o.status === "SHIPPED").length,
    draft: orders.filter((o) => o.status === "DRAFT").length,
  }), [orders]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("commercialModule")} · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ShoppingCart size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("commercialOrdersTitle")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("commercialOrdersSubtitle")}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(""); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={15} /> {t("createSalesOrder")}
          </button>
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

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: t("totalOrdersKpi"), value: kpis.total, color: "text-slate-900 dark:text-white" },
            { label: t("draft"), value: kpis.draft, color: "text-slate-600 dark:text-slate-300" },
            { label: t("completed"), value: kpis.confirmed, color: "text-blue-700 dark:text-blue-400" },
            { label: t("shipped"), value: kpis.shipped, color: "text-emerald-700 dark:text-emerald-400" },
          ].map((kpi) => (
            <div key={kpi.label} className={`${surface} px-6 py-5`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {kpi.label}
              </p>
              <p className={`mt-2 text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Create order form (collapsible) ── */}
        {showForm && (
          <div className={`${surface} p-6`}>
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {t("createSalesOrder")}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>{t("orderNumber")}</label>
                <input
                  className={inputClass}
                  placeholder="ORD-001"
                  value={form.orderNo}
                  onChange={(e) => setForm((f) => ({ ...f, orderNo: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>{t("customerName")}</label>
                <input
                  className={inputClass}
                  placeholder={t("customerName")}
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>{t("notesOptional")}</label>
              <textarea
                className={inputClass}
                rows={2}
                placeholder={t("notesOptional")}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Lines */}
            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t("orderLines")}
              </p>
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_140px_36px]">
                    <select
                      className={inputClass}
                      value={line.productId}
                      onChange={(e) => updateLine(index, "productId", e.target.value)}
                    >
                      <option value="">{t("selectProduct")}</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      type="number"
                      min="1"
                      placeholder={t("quantity")}
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", e.target.value)}
                    />
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      placeholder={t("unitPrice")}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                    />
                    <button
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                      className="flex h-10 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 dark:border-slate-700 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/20"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addLine}
                className="mt-3 inline-flex items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:text-slate-300"
              >
                <Plus size={12} /> {t("addLineBtn")}
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setError(""); }}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {t("createOrder")}
              </button>
            </div>
          </div>
        )}

        {/* ── Orders list ── */}
        <div className={`${surface} overflow-hidden`}>
          {/* Table header + filters */}
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              {t("allOrdersList")}
              <span className="ml-2 text-sm font-normal text-slate-400">{filtered.length}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchCommercialOrders")}
                  className="w-52 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <option value="ALL">{t("allStatus")}</option>
                <option value="DRAFT">{t("draft")}</option>
                <option value="CONFIRMED">{t("completed")}</option>
                <option value="SHIPPED">{t("shipped")}</option>
                <option value="CANCELLED">{t("cancelled")}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> {t("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-400 dark:text-slate-500">
              <ShoppingCart size={32} className="opacity-30" />
              {orders.length === 0 ? t("noOrdersYet") : t("noCommercialOrdersMatch")}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((order) => {
                const total = orderTotal(order);
                const isExpanded = expandedId === order._id;
                const busy = actionId === order._id;

                return (
                  <div key={order._id}>
                    {/* Order row */}
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Order info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {order.orderNo}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(order.status)}`}
                          >
                            <StatusIcon status={order.status} />
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {order.customerName}
                        </p>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {order.lines.length} {t("orderLines").toLowerCase()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        {order.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => runAction("confirm", order._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                              {t("confirm")}
                            </button>
                            <button
                              onClick={() => runAction("cancel", order._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                            >
                              <XCircle size={11} /> {t("cancel")}
                            </button>
                          </>
                        )}
                        {order.status === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() => runAction("ship", order._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <Truck size={11} />}
                              {t("ship")}
                            </button>
                            <button
                              onClick={() => runAction("cancel", order._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                            >
                              <XCircle size={11} /> {t("cancel")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded lines */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        {order.notes && (
                          <p className="mb-3 text-xs italic text-slate-500 dark:text-slate-400">
                            {order.notes}
                          </p>
                        )}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                              {[t("product"), t("quantity"), t("unitPrice"), t("amount")].map((h) => (
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
                                  {line.unitPrice.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
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
                          <tfoot>
                            <tr className="border-t border-slate-200 dark:border-slate-800">
                              <td colSpan={3} className="pt-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t("totalTnd")}
                              </td>
                              <td className="pt-3 font-bold text-slate-900 dark:text-white">
                                {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
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
