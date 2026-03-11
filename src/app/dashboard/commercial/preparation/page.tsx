"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  ChevronDown,
  ShoppingCart,
  Printer,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    PREPARED: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    CANCELLED: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
    SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    DELIVERED: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
}

export default function CommercialPreparationPage() {
  const { t } = useLanguage();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await salesOrderService.getAll();
      setOrders(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load preparation orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePrepare = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.prepare(id);
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to prepare order");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.cancel(id);
      await fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setActionId(null);
    }
  };

  const confirmedOrders = useMemo(
    () => orders.filter((o) => o.status === "CONFIRMED"),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return confirmedOrders.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
    );
  }, [confirmedOrders, search]);

  const totalUnits = useMemo(
    () =>
      filtered.reduce(
        (sum, order) => sum + order.lines.reduce((lineSum, l) => lineSum + l.quantity, 0),
        0
      ),
    [filtered]
  );

  const orderTotal = (order: SalesOrder) =>
    order.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const printPickingSlip = (order: SalesOrder) => {
    const rows = order.lines
      .map(
        (line) => `
        <tr>
          <td class="check-col"><div class="check-box"></div></td>
          <td>${line.productId?.sku || "—"}</td>
          <td>${line.productId?.name || "—"}</td>
          <td class="qty-cell">${line.quantity}</td>
          <td class="qty-cell empty">___</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="fr"><head>
  <meta charset="utf-8" />
  <title>Picking Slip · ${order.orderNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:20px}
    .brand{font-size:18px;font-weight:bold;letter-spacing:.04em}
    .brand-sub{font-size:10px;color:#777;margin-top:3px}
    .doc-right{text-align:right}
    .doc-title{font-size:17px;font-weight:bold}
    .doc-meta{font-size:11px;color:#555;margin-top:3px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:22px}
    .info-box{border:1px solid #ddd;padding:10px 12px;border-radius:3px}
    .info-label{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:3px}
    .info-value{font-size:13px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-bottom:28px}
    th{background:#f0f0f0;border:1px solid #ccc;padding:7px 10px;font-size:9px;text-transform:uppercase;letter-spacing:.1em;text-align:left}
    td{border:1px solid #ddd;padding:9px 10px;font-size:12px;vertical-align:middle}
    .check-col{width:36px;text-align:center}
    .check-box{width:15px;height:15px;border:1.5px solid #333;display:inline-block;border-radius:2px}
    .qty-cell{text-align:center;font-size:14px;font-weight:bold}
    .empty{color:#bbb;font-weight:normal}
    .footer{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:8px}
    .sig-box{border-top:1px solid #333;padding-top:6px;font-size:11px;color:#666;padding-bottom:48px}
    .stamp{margin-top:20px;text-align:center;font-size:9px;color:#bbb}
    @media print{body{padding:12px}}
  </style>
</head><body>
  <div class="header">
    <div>
      <div class="brand">ERP · Commercial</div>
      <div class="brand-sub">Bon de Préparation / Picking Slip</div>
    </div>
    <div class="doc-right">
      <div class="doc-title">BON DE PRÉPARATION</div>
      <div class="doc-meta">N° ${order.orderNo}</div>
      <div class="doc-meta">Émis le ${new Date().toLocaleDateString("fr-TN")}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Client</div>
      <div class="info-value">${order.customerName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Date promise</div>
      <div class="info-value">${order.promisedDate ? new Date(order.promisedDate).toLocaleDateString("fr-TN") : "—"}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Statut</div>
      <div class="info-value">${order.status}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="check-col">✓</th>
        <th>SKU</th>
        <th>Produit</th>
        <th style="text-align:center">Qté à préparer</th>
        <th style="text-align:center">Qté préparée</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <div class="sig-box">Préparé par : ____________________</div>
    <div class="sig-box">Validé par : ____________________</div>
  </div>

  <div class="stamp">
    Généré le ${new Date().toLocaleString("fr-TN")} · Réf. ${order.orderNo}
  </div>
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.documentElement.innerHTML = html;
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  };

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
                <Package size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("prepared") || "Preparation"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Orders confirmed and waiting for warehouse preparation
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <XCircle size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Confirmed Orders",
              value: confirmedOrders.length,
              color: "text-blue-700 dark:text-blue-400",
            },
            {
              label: "Filtered",
              value: filtered.length,
              color: "text-slate-900 dark:text-white",
            },
            {
              label: "Units to Prepare",
              value: totalUnits,
              color: "text-violet-700 dark:text-violet-400",
            },
            {
              label: "Ready for Shipping",
              value: orders.filter((o) => o.status === "PREPARED").length,
              color: "text-emerald-700 dark:text-emerald-400",
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
              Orders to Prepare
              <span className="ml-2 text-sm font-normal text-slate-400">{filtered.length}</span>
            </h2>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search confirmed orders"
                className="w-56 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> {t("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-sm text-slate-400 dark:text-slate-500">
              <ShoppingCart size={32} className="opacity-30" />
              {confirmedOrders.length === 0
                ? "No confirmed orders waiting for preparation"
                : "No preparation orders match your search"}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((order) => {
                const total = orderTotal(order);
                const isExpanded = expandedId === order._id;
                const busy = actionId === order._id;
                const totalQty = order.lines.reduce((sum, line) => sum + line.quantity, 0);

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
                        {order.promisedDate && (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Promised: {new Date(order.promisedDate).toLocaleDateString("fr-TN")}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {totalQty} units · {order.lines.length} {t("orderLines").toLowerCase()}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => printPickingSlip(order)}
                          title="Print picking slip"
                          className="flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <Printer size={13} />
                        </button>

                        <button
                          onClick={() => handlePrepare(order._id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Package size={11} />
                          )}
                          {t("prepared") || "Prepare"}
                        </button>

                        <button
                          onClick={() => handleCancel(order._id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                        >
                          <XCircle size={11} /> {t("cancel")}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        {order.notes && (
                          <p className="mb-3 text-xs italic text-slate-500 dark:text-slate-400">
                            {order.notes}
                          </p>
                        )}

                        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {order.createdAt && (
                            <span>
                              Created: {new Date(order.createdAt).toLocaleDateString("fr-TN")}
                            </span>
                          )}
                          {order.promisedDate && (
                            <span>
                              Promised: {new Date(order.promisedDate).toLocaleDateString("fr-TN")}
                            </span>
                          )}
                        </div>

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
                          <tfoot>
                            <tr className="border-t border-slate-200 dark:border-slate-800">
                              <td
                                colSpan={3}
                                className="pt-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                              >
                                {t("totalTnd")}
                              </td>
                              <td className="pt-3 font-bold text-slate-900 dark:text-white">
                                {total.toLocaleString("fr-TN", {
                                  minimumFractionDigits: 2,
                                })}{" "}
                                TND
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