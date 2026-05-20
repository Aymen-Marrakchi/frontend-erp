"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import {
  purchaseOrderService,
  PurchaseOrder,
} from "@/services/purchase/purchaseOrderService";
import { purchaseSettingService, PurchaseSettings } from "@/services/purchase/purchaseSettingService";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  Search,
  Loader2,
  CheckCircle2,
  Send,
  PackageCheck,
  Archive,
  Printer,
  X,
  FileText,
  Clock,
  Plus,
  Hourglass,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function getErr(err: unknown, fallback = "Une erreur est survenue"): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response: { data?: { message?: string } } }).response;
    if (typeof r.data?.message === "string") return r.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  VALIDATED: "Validé",
  SENT: "Envoyé",
  RECEIVED: "Reçu",
  CLOSED: "Clôturé",
  CANCELLED: "Annulé",
};

const STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  VALIDATED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  SENT: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  RECEIVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CLOSED: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  CANCELLED: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
};

function fmt(n: number) {
  return (n ?? 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 });
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Print Document ───────────────────────────────────────────────────────────

function PrintDocument({
  order,
}: {
  order: PurchaseOrder;
  settings: PurchaseSettings | null;
}) {
  return (
    <div id="bc-print-area" style={{ fontFamily: "Arial, sans-serif", background: "#fff", color: "#0f172a", padding: "40px 48px", fontSize: "13px", lineHeight: "1.5" }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", paddingBottom: "20px", borderBottom: "2px solid #0f172a" }}>
        {/* Company */}
        <div>
          <div style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "-0.5px", color: "#0f172a" }}>EMM TN</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Zone industrielle · Tunis, Tunisie</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>MF : 0000000/A/A/M/000</div>
        </div>
        {/* Document title + number */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>Bon de Commande</div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", letterSpacing: "-1px" }}>{order.orderNo}</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Date : {fmtDate(order.createdAt)}</div>
          {order.tenderId && <div style={{ fontSize: "11px", color: "#94a3b8" }}>AO : {order.tenderId.tenderNo}</div>}
          {order.purchaseRequestId && <div style={{ fontSize: "11px", color: "#94a3b8" }}>DA : {order.purchaseRequestId.requestNo}</div>}
        </div>
      </div>

      {/* ── Parties ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
        {/* Buyer */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.16em", color: "#94a3b8", marginBottom: "8px" }}>Acheteur</div>
          <div style={{ fontWeight: "700", fontSize: "14px" }}>EMM TN</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>Service Achats</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>Zone industrielle · Tunis</div>
        </div>
        {/* Supplier */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.16em", color: "#94a3b8", marginBottom: "8px" }}>Fournisseur</div>
          <div style={{ fontWeight: "700", fontSize: "14px" }}>{order.supplierId.name}</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>{order.supplierId.supplierNo}</div>
          {order.supplierId.category && <div style={{ color: "#94a3b8", fontSize: "11px" }}>Catégorie : {order.supplierId.category}</div>}
          {order.supplierId.paymentTerms && <div style={{ color: "#94a3b8", fontSize: "11px" }}>Conditions : {order.supplierId.paymentTerms}</div>}
        </div>
      </div>

      {/* ── Lines table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#0f172a", color: "#fff" }}>
            <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Désignation</th>
            <th style={{ padding: "9px 12px", textAlign: "center", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Qté</th>
            <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>PU HT (TND)</th>
            <th style={{ padding: "9px 12px", textAlign: "center", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Remise</th>
            <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Total HT (TND)</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => {
            const ht = l.quantity * l.unitPrice * (1 - (l.discountRate || 0) / 100);
            return (
              <tr key={l._id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ fontWeight: "600" }}>{l.productId?.name ?? l.description ?? "—"}</div>
                  {l.productId && l.description && <div style={{ fontSize: "11px", color: "#94a3b8" }}>{l.description}</div>}
                  {l.productId?.sku && <div style={{ fontSize: "10px", color: "#cbd5e1", fontFamily: "monospace" }}>{l.productId.sku}</div>}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>{l.quantity}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(l.unitPrice)}</td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748b" }}>{l.discountRate ? `${l.discountRate}%` : "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "700" }}>{fmt(ht)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Totals + Conditions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "start", marginBottom: "32px" }}>
        {/* Conditions */}
        <div style={{ fontSize: "12px" }}>
          {order.deliveryTerms && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.14em", color: "#64748b", marginBottom: "3px" }}>Conditions de livraison</div>
              <div style={{ color: "#334155" }}>{order.deliveryTerms}</div>
            </div>
          )}
          {order.paymentTerms && (
            <div>
              <div style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.14em", color: "#64748b", marginBottom: "3px" }}>Conditions de paiement</div>
              <div style={{ color: "#334155" }}>{order.paymentTerms}</div>
            </div>
          )}
        </div>
        {/* Totals box */}
        <div style={{ minWidth: "260px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
          {[
            { label: "Total HT", value: fmt(order.subtotalHt) },
            { label: `FODEC (${order.fodecRate ?? 1}%)`, value: fmt(order.totalFodec ?? 0) },
            { label: `TVA (${order.vatRate ?? 19}%)`, value: fmt(order.totalVat) },
            { label: "Timbre fiscal", value: fmt(order.timbreFiscal ?? 1) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 14px", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
              <span style={{ color: "#64748b" }}>{label}</span>
              <span style={{ fontWeight: "600" }}>{value} TND</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#0f172a", color: "#fff", fontSize: "13px", fontWeight: "900" }}>
            <span>TOTAL TTC</span>
            <span>{fmt(order.totalTtc)} TND</span>
          </div>
        </div>
      </div>

      {/* ── Signatures ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
        {["Visa & Cachet Acheteur", "Visa & Cachet Fournisseur"].map((label) => (
          <div key={label}>
            <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: "#94a3b8", marginBottom: "48px" }}>{label}</div>
            <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "11px", color: "#cbd5e1" }}>Signature / Date</div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: "32px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", textAlign: "center", fontSize: "10px", color: "#94a3b8" }}>
        EMM TN · Zone industrielle, Tunis · Tél : +216 XX XXX XXX · MF : 0000000/A/A/M/000
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [settings, setSettings] = useState<PurchaseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<PurchaseOrder | null>(null);


  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [ordersData, settingsData] = await Promise.all([
        purchaseOrderService.getAll(),
        purchaseSettingService.get(),
      ]);
      setOrders(ordersData);
      setSettings(settingsData);
    } catch (err) {
      setError(getErr(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const matchSearch =
        !q ||
        [o.orderNo, o.supplierId.name, o.supplierId.supplierNo,
          o.purchaseRequestId?.requestNo, o.tenderId?.tenderNo]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    draft: orders.filter((o) => o.status === "DRAFT").length,
    validated: orders.filter((o) => o.status === "VALIDATED").length,
    sent: orders.filter((o) => o.status === "SENT").length,
    received: orders.filter((o) => o.status === "RECEIVED").length,
    closed: orders.filter((o) => o.status === "CLOSED").length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
  }), [orders]);

  const handleStatus = async (id: string, status: "VALIDATED" | "SENT" | "CLOSED") => {
    setActionLoading(id + status);
    try {
      await purchaseOrderService.updateStatus(id, status);
      await fetchAll();
    } catch (err) {
      setError(getErr(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id + "CANCELLED");
    try {
      await purchaseOrderService.cancel(id);
      await fetchAll();
    } catch (err) {
      setError(getErr(err));
    } finally {
      setActionLoading(null);
    }
  };


  const handlePrint = () => {
    const el = document.getElementById("bc-print-area");
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${printOrder?.orderNo ?? "BC"}</title>` +
      `<style>body{font-family:sans-serif;margin:0;padding:0;color:#0f172a;}` +
      `@media print{body{-webkit-print-color-adjust:exact;}}</style></head>` +
      `<body>${el.innerHTML}</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const STATUS_FILTERS = ["ALL", "DRAFT", "VALIDATED", "SENT", "RECEIVED", "CLOSED", "CANCELLED"];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Achats · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ShoppingCart size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Bons de Commande
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Suivi des commandes fournisseurs · générés automatiquement depuis les AO
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
          {[
            { label: "Total", value: stats.total, Icon: FileText, cls: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
            { label: "Brouillon", value: stats.draft, Icon: FileText, cls: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800/50" },
            { label: "Validés", value: stats.validated, Icon: CheckCircle2, cls: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { label: "Envoyés", value: stats.sent, Icon: Send, cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
            { label: "Reçus", value: stats.received, Icon: PackageCheck, cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Clôturés", value: stats.closed, Icon: Archive, cls: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
            { label: "Annulés", value: stats.cancelled, Icon: X, cls: "text-rose-500 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
          ].map(({ label, value, Icon, cls, bg }) => (
            <div key={label} className={`${surface} flex items-center gap-3 px-4 py-4`}>
              <div className={`rounded-xl p-2 ${bg}`}>
                <Icon size={14} className={cls} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-xl font-bold text-slate-950 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center dark:border-slate-800">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Liste des BCs</h2>
              <p className="mt-0.5 text-sm text-slate-500">{filtered.length} bon(s)</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === s
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {s === "ALL" ? "Tous" : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher BC, fournisseur..."
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ShoppingCart size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Aucun bon de commande</p>
              <p className="mt-1 text-xs text-slate-400">
                Les BCs sont générés automatiquement après adjudication d&apos;un AO
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">N° BC</th>
                    <th className="px-6 py-3 font-medium">Référence</th>
                    <th className="px-6 py-3 font-medium">Fournisseur</th>
                    <th className="px-6 py-3 font-medium">Produit</th>
                    <th className="px-6 py-3 font-medium text-right">Montant TTC</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((order) => {
                    const line = order.lines[0];
                    const busy = (s: string) => actionLoading === order._id + s;
                    return (
                      <tr key={order._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-slate-950 dark:text-white">
                            {order.orderNo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {order.tenderId
                            ? `AO · ${order.tenderId.tenderNo}`
                            : order.purchaseRequestId
                            ? `DA · ${order.purchaseRequestId.requestNo}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900 dark:text-white">{order.supplierId.name}</p>
                          <p className="text-xs text-slate-400">{order.supplierId.supplierNo}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {line ? (
                            <>
                              {line.productId?.name ?? line.description ?? "—"}
                              <span className="ml-1 text-xs text-slate-400">× {line.quantity}</span>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-slate-950 dark:text-white">{fmt(order.totalTtc)}</span>
                          <span className="ml-1 text-xs text-slate-400">TND</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLS[order.status] ?? ""}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{fmtDate(order.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPrintOrder(order)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Voir / Imprimer"
                            >
                              <Printer size={14} />
                            </button>

                            {order.status === "DRAFT" && (
                              <>
                                <button
                                  onClick={() => handleStatus(order._id, "VALIDATED")}
                                  disabled={!!actionLoading}
                                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
                                >
                                  {busy("VALIDATED") ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                  Valider
                                </button>
                                <button
                                  onClick={() => handleCancel(order._id)}
                                  disabled={!!actionLoading}
                                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-400"
                                >
                                  {busy("CANCELLED") ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                                  Annuler
                                </button>
                              </>
                            )}

                            {order.status === "VALIDATED" && (
                              <button
                                onClick={() => handleStatus(order._id, "SENT")}
                                disabled={!!actionLoading}
                                className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-400 disabled:opacity-60"
                              >
                                {busy("SENT") ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                Envoyer
                              </button>
                            )}

                            {order.status === "SENT" && (
                              <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                <Hourglass size={10} />
                                En attente de réception
                              </span>
                            )}

                            {order.status === "RECEIVED" && (
                              <button
                                onClick={() => handleStatus(order._id, "CLOSED")}
                                disabled={!!actionLoading}
                                className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-600 disabled:opacity-60"
                              >
                                {busy("CLOSED") ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
                                Clôturer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      {/* ── Print Modal ───────────────────────────────────────────────────────── */}
      {printOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="my-4 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-slate-500" />
                <span className="font-semibold text-slate-950">{printOrder.orderNo}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLS[printOrder.status]}`}>
                  {STATUS_LABEL[printOrder.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Printer size={13} />
                  Imprimer / PDF
                </button>
                <button
                  onClick={() => setPrintOrder(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <PrintDocument order={printOrder} settings={settings} />
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
