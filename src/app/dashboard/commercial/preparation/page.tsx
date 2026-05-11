"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { salesOrderService, type SalesOrder } from "@/services/commercial/salesOrderService";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Package, Printer, Search, ShoppingCart } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

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
      if (!existing.preparedBy && line.depotPreparedBy?.name) {
        existing.preparedBy = line.depotPreparedBy.name;
      }
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

function openInvoiceDocument(order: SalesOrder, invoice: CustomerInvoice) {
  const rows = invoice.lines
    .map(
      (line) => `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:8px">${line.productId?.sku || "—"}</td>
          <td style="border:1px solid #cbd5e1;padding:8px">${line.productId?.name || "—"}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:center">${line.quantity}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right">${line.baseUnitHt.toFixed(3)}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right">${line.subtotalHt.toFixed(3)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Devis / Facture · ${invoice.invoiceNo}</title>
  </head>
  <body style="font-family:Arial,sans-serif;color:#0f172a;padding:28px">
    <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
      <div>
        <div style="font-size:18px;font-weight:700">ERP · Commercial</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Devis / Facture client</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700">${invoice.invoiceNo}</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">${new Date(
          invoice.issueDate || Date.now()
        ).toLocaleDateString("fr-TN")}</div>
      </div>
    </header>

    <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Client</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.customerName}</div>
      </div>
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Commande</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${order.orderNo}</div>
      </div>
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Mode prix</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.pricingMode}</div>
      </div>
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Paiement</div>
        <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.paymentMethod}</div>
      </div>
    </section>

    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      <thead>
        <tr>
          <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">SKU</th>
          <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">Produit</th>
          <th style="border:1px solid #cbd5e1;padding:8px;text-align:center;background:#f8fafc">Qté</th>
          <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;background:#f8fafc">HT U.</th>
          <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;background:#f8fafc">HT Ligne</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <section style="margin-left:auto;width:320px;font-size:13px">
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>HT</span><strong>${invoice.subtotalHt.toFixed(3)} TND</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>TVA</span><strong>${invoice.totalVat.toFixed(3)} TND</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>FODEC</span><strong>${invoice.totalFodec.toFixed(3)} TND</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Timbre</span><strong>${invoice.timbreFiscal.toFixed(3)} TND</strong></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #334155;margin-top:6px;font-size:15px"><span>TTC</span><strong>${invoice.totalTtc.toFixed(3)} TND</strong></div>
    </section>
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

  const handleValidatePicking = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await salesOrderService.validatePacking(id);
      await fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to validate picking"));
    } finally {
      setActionId(null);
    }
  };

  const handlePrintInvoice = async (order: SalesOrder) => {
    try {
      setActionId(order._id);
      setError("");
      const invoice = await customerInvoiceService.getByOrderId(order._id);
      openInvoiceDocument(order, invoice);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to print invoice"));
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
                  Wait for depot preparation, then validate picking when depot work is done.
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
              value: orders.filter((order) => order.status === "PREPARED" && !order.packingValidatedAt)
                .length,
              color: "text-amber-700 dark:text-amber-400",
            },
            {
              label: t("unitsToPrepareLabel"),
              value: totalUnits,
              color: "text-violet-700 dark:text-violet-400",
            },
            {
              label: t("readyForShipping"),
              value: orders.filter((order) => order.status === "PREPARED" && !!order.packingValidatedAt)
                .length,
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
                const depotGroups = groupByDepot(order);
                const allDepotsPrepared = depotGroups.every((group) => group.prepared);
                const canValidatePicking =
                  (order.status === "PREPARED" || allDepotsPrepared) &&
                  !order.packingValidatedAt;

                return (
                  <div key={order._id}>
                    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{order.orderNo}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {order.customerName}
                        </p>
                      </div>

                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>{order.lines.reduce((sum, line) => sum + line.quantity, 0)} units</p>
                        <p>{depotGroups.length} depot(s)</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {order.packingValidatedAt ? (
                          <>
                            <button
                              onClick={() => handlePrintInvoice(order)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {busy ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
                              Print invoice
                            </button>
                            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              <Package size={12} />
                              Picking validated
                            </span>
                          </>
                        ) : canValidatePicking ? (
                          <>
                            <button
                              onClick={() => handlePrintInvoice(order)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              {busy ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
                              Print invoice
                            </button>
                            <button
                              onClick={() => handleValidatePicking(order._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                            >
                              {busy ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                              Validate Picking
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Package size={12} />
                            Waiting depot
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="grid gap-4 bg-slate-50 px-6 pb-6 pt-2 dark:bg-slate-950/40 md:grid-cols-2">
                        {depotGroups.map((group) => (
                          <div
                            key={`${order._id}-${group.depotName}`}
                            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{group.depotName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {group.lines.reduce((sum, line) => sum + line.quantity, 0)} units
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  group.prepared
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                }`}
                              >
                                {group.prepared ? "Prepared" : "Waiting depot"}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {group.lines.map((line, index) => (
                                <div
                                  key={`${group.depotName}-${index}`}
                                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
                                >
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {line.productId?.name || "Unknown product"}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {line.productId?.sku || "—"}
                                    </p>
                                  </div>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {line.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {group.preparedAt ? (
                              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                Prepared {new Date(group.preparedAt).toLocaleString("fr-TN")}
                                {group.preparedBy ? ` by ${group.preparedBy}` : ""}
                              </p>
                            ) : null}
                          </div>
                        ))}
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
