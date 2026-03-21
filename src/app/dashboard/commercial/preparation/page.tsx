"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { salesOrderService, type SalesOrder } from "@/services/commercial/salesOrderService";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package,
  Printer,
  Search,
  ShoppingCart,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function lineAmount(line: { quantity: number; unitPrice: number; discount?: number }) {
  const subtotal = line.quantity * line.unitPrice;
  const discountPct = Math.min(100, Math.max(0, line.discount || 0));
  return subtotal * (1 - discountPct / 100);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ORDONNANCED: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    PREPARED: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    CANCELLED: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
    SHIPPED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function groupByDepot(order: SalesOrder) {
  const groups = new Map<
    string,
    {
      depotName: string;
      prepared: boolean;
      preparedAt?: string | null;
      preparedBy?: string | null;
      lines: SalesOrder["lines"];
    }
  >();

  order.lines.forEach((line) => {
    const depotName = line.depotId?.name || "No depot";
    const key = line.depotId?._id || `none:${depotName}`;
    const existing = groups.get(key);

    if (existing) {
      existing.lines.push(line);
      existing.prepared = existing.prepared && Boolean(line.depotPreparedAt);
      if (!existing.preparedAt && line.depotPreparedAt) existing.preparedAt = line.depotPreparedAt;
      if (!existing.preparedBy && line.depotPreparedBy?.name) existing.preparedBy = line.depotPreparedBy.name;
      return;
    }

    groups.set(key, {
      depotName,
      prepared: Boolean(line.depotPreparedAt),
      preparedAt: line.depotPreparedAt,
      preparedBy: line.depotPreparedBy?.name || null,
      lines: [line],
    });
  });

  return Array.from(groups.values());
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
      setOrders(await salesOrderService.getAll());
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load preparation orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openPickingSlip = (order: SalesOrder) => {
    const depotSections = groupByDepot(order)
      .map((group) => {
        const rows = group.lines
          .map(
            (line) => `
              <tr>
                <td>${line.productId?.sku || "—"}</td>
                <td>${line.productId?.name || "—"}</td>
                <td style="text-align:center">${line.quantity}</td>
                <td style="text-align:center">___</td>
              </tr>`
          )
          .join("");

        return `
          <section style="margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <h3 style="font-size:13px;margin:0">${group.depotName}</h3>
              <span style="font-size:11px;color:#64748b">${group.lines.reduce((sum, line) => sum + line.quantity, 0)} units</span>
            </div>
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">SKU</th>
                  <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">Produit</th>
                  <th style="border:1px solid #cbd5e1;padding:8px;text-align:center;background:#f8fafc">Qté</th>
                  <th style="border:1px solid #cbd5e1;padding:8px;text-align:center;background:#f8fafc">Préparé</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bon de préparation · ${order.orderNo}</title>
  </head>
  <body style="font-family:Arial,sans-serif;color:#0f172a;padding:28px">
    <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
      <div>
        <div style="font-size:18px;font-weight:700">ERP · Commercial</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Bon de préparation</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">${order.orderNo}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">${new Date().toLocaleDateString("fr-TN")}</div>
      </div>
    </header>

    <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px">
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Client</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${order.customerName}</div>
      </div>
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Date promise</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${order.promisedDate ? new Date(order.promisedDate).toLocaleDateString("fr-TN") : "—"}</div>
      </div>
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Statut</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${order.status}</div>
      </div>
    </section>

    ${depotSections}

    <footer style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px">
      <div style="border-top:1px solid #334155;padding-top:8px;color:#64748b;font-size:12px">Préparé par</div>
      <div style="border-top:1px solid #334155;padding-top:8px;color:#64748b;font-size:12px">Validé par</div>
    </footer>
  </body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  };

  const handlePrintPickingSlip = async (order: SalesOrder) => {
    try {
      setActionId(order._id);
      setError("");
      await salesOrderService.markPickingSlipPrinted(order._id);
      openPickingSlip(order);
      await fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to print picking slip"));
    } finally {
      setActionId(null);
    }
  };

  const handleValidatePacking = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.validatePacking(id);
      await fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to validate packing"));
    } finally {
      setActionId(null);
    }
  };

  const preparationOrders = useMemo(
    () => orders.filter((order) => ["ORDONNANCED", "PREPARED"].includes(order.status)),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return preparationOrders.filter(
      (order) =>
        order.orderNo.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q)
    );
  }, [preparationOrders, search]);

  const totalUnits = useMemo(
    () =>
      filtered.reduce(
        (sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
        0
      ),
    [filtered]
  );

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
                  Follow depot preparation by depot and validate picking only once every depot is done.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Waiting Depot",
              value: orders.filter((order) => order.status === "ORDONNANCED").length,
              color: "text-blue-700 dark:text-blue-400",
            },
            {
              label: t("preparedPendingPackingLabel"),
              value: orders.filter((order) => order.status === "PREPARED" && !order.packingValidatedAt).length,
              color: "text-amber-700 dark:text-amber-400",
            },
            {
              label: t("unitsToPrepareLabel"),
              value: totalUnits,
              color: "text-violet-700 dark:text-violet-400",
            },
            {
              label: t("readyForShipping"),
              value: orders.filter((order) => order.status === "PREPARED" && !!order.packingValidatedAt).length,
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
              {t("ordersToPrepare")}
              <span className="ml-2 text-sm font-normal text-slate-400">{filtered.length}</span>
            </h2>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchConfirmedOrders")}
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
              {preparationOrders.length === 0 ? "No orders in preparation flow yet" : t("noPreparationMatch")}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((order) => {
                const isExpanded = expandedId === order._id;
                const busy = actionId === order._id;
                const total = order.lines.reduce((sum, line) => sum + lineAmount(line), 0);
                const depotGroups = groupByDepot(order);
                const allDepotsPrepared = depotGroups.every((group) => group.prepared);

                return (
                  <div key={order._id}>
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{order.orderNo}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {order.customerName}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {order.lines.reduce((sum, line) => sum + line.quantity, 0)} units
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handlePrintPickingSlip(order)}
                          disabled={busy}
                          title={t("printPickingSlip")}
                          className="flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <Printer size={13} />
                        </button>

                        {order.status === "ORDONNANCED" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Package size={11} />
                            Waiting depot
                          </span>
                        ) : order.packingValidatedAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <CheckCircle2 size={11} />
                            {t("readyForShipping")}
                          </span>
                        ) : !allDepotsPrepared ? (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Package size={11} />
                            Waiting depot
                          </span>
                        ) : !order.pickingSlipPrintedAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            <Printer size={11} />
                            Print picking first
                          </span>
                        ) : (
                          <button
                            onClick={() => handleValidatePacking(order._id)}
                            disabled={busy || order.status !== "PREPARED"}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
                          >
                            {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            {t("validatePacking")}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                        <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {order.createdAt ? (
                            <span>Created: {new Date(order.createdAt).toLocaleDateString("fr-TN")}</span>
                          ) : null}
                          {order.preparedAt ? (
                            <span>All depots prepared: {new Date(order.preparedAt).toLocaleDateString("fr-TN")}</span>
                          ) : null}
                          {order.packingValidatedAt ? (
                            <span>Packed: {new Date(order.packingValidatedAt).toLocaleDateString("fr-TN")}</span>
                          ) : null}
                        </div>

                        <div className="space-y-4">
                          {groupByDepot(order).map((group) => (
                            <div
                              key={`${order._id}-${group.depotName}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-white">{group.depotName}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {group.lines.reduce((sum, line) => sum + line.quantity, 0)} units
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                      group.prepared
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                    }`}
                                  >
                                    {group.prepared ? "Depot prepared" : "Waiting depot"}
                                  </span>
                                  {group.preparedAt ? (
                                    <p className="mt-1 text-[11px] text-slate-400">
                                      {new Date(group.preparedAt).toLocaleDateString("fr-TN")}
                                      {group.preparedBy ? ` · ${group.preparedBy}` : ""}
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-800">
                                    {["Product", t("quantity"), t("unitPrice"), "Remise", t("amount")].map((header) => (
                                      <th
                                        key={header}
                                        className="pb-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                                      >
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {group.lines.map((line, index) => (
                                    <tr key={index}>
                                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                                        {line.productId?.name || "—"}
                                      </td>
                                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                        {line.quantity}
                                      </td>
                                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                        {line.unitPrice.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                                      </td>
                                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                                        {line.discount || 0}%
                                      </td>
                                      <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                                        {lineAmount(line).toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
