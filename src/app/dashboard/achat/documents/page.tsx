"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { purchaseOrderService, type PurchaseOrder } from "@/services/purchase/purchaseOrderService";
import { purchaseReceiptService, type PurchaseReceipt } from "@/services/purchase/purchaseReceiptService";
import { purchaseInvoiceService, type PurchaseInvoice } from "@/services/purchase/purchaseInvoiceService";
import { purchaseReturnService, type PurchaseReturn } from "@/services/purchase/purchaseReturnService";
import { useEffect, useState } from "react";
import { FileText, Loader2, Search, ShoppingCart, Truck, Receipt, RotateCcw, Download, Printer } from "lucide-react";
import { financeService, type CompanySettings } from "@/services/finance/financeService";
import { exportToPdf, exportToCsv, printInvoiceTemplate } from "@/lib/pdfExport";

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  VALIDATED:        "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  SENT:             "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  RECEIVED:         "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  CLOSED:           "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  CANCELLED:        "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  PARTIAL:          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  FULL:             "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  LITIGATION:       "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  APPROVED:         "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  REJECTED:         "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  PARTIALLY_PAID:   "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PAID:             "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const tnd = (v: number) => v.toLocaleString("fr-TN", { minimumFractionDigits: 3 });

const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const thCls = "px-5 py-3 font-medium";
const tdCls = "px-5 py-3";

type Tab = "commandes" | "receptions" | "factures" | "retours";

export default function AchatDocumentsPage() {
  const [tab, setTab]           = useState<Tab>("commandes");
  const [orders, setOrders]     = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [returns, setReturns]   = useState<PurchaseReturn[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    setLoading(true);
    financeService.getSettings().then(setSettings).catch(() => {});
    Promise.all([purchaseOrderService.getAll(), purchaseReceiptService.getAll(), purchaseInvoiceService.getAll(), purchaseReturnService.getAll()])
      .then(([ord, rec, inv, ret]) => { setOrders(ord); setReceipts(rec); setInvoices(inv); setReturns(ret); })
      .catch((e) => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filteredOrders   = orders.filter((o) => o.orderNo.toLowerCase().includes(q) || o.supplierId?.name.toLowerCase().includes(q));
  const filteredReceipts = receipts.filter((r) => r.receiptNo.toLowerCase().includes(q) || r.supplierId?.name.toLowerCase().includes(q));
  const filteredInvoices = invoices.filter((i) => i.invoiceNo.toLowerCase().includes(q) || i.supplierId?.name.toLowerCase().includes(q));
  const filteredReturns  = returns.filter((r) => r.returnNo.toLowerCase().includes(q) || r.supplierId?.name.toLowerCase().includes(q));

  const getExportData = () => {
    if (tab === "commandes") return {
      title: "Documents Achats — Bons de commande", count: filteredOrders.length,
      columns: ["N° Commande", "Fournisseur", "Statut", "Total TTC", "Date création", "Date validation"],
      rows: filteredOrders.map((o) => [o.orderNo, o.supplierId?.name ?? "—", o.status.replace(/_/g, " "), `${tnd(o.totalTtc)} TND`, fmt(o.createdAt), fmt(o.validatedAt)]),
      filename: `commandes-achat-${new Date().toISOString().slice(0, 10)}`,
    };
    if (tab === "receptions") return {
      title: "Documents Achats — Bons de réception", count: filteredReceipts.length,
      columns: ["N° Bon", "Fournisseur", "N° Commande", "Dépôt", "Statut", "Lignes", "Date"],
      rows: filteredReceipts.map((r) => [r.receiptNo, r.supplierId?.name ?? "—", r.purchaseOrderId?.orderNo ?? "—", r.depotId?.name ?? "—", r.receiptStatus, r.lines?.length ?? 0, fmt(r.createdAt)]),
      filename: `receptions-${new Date().toISOString().slice(0, 10)}`,
    };
    if (tab === "factures") return {
      title: "Documents Achats — Factures fournisseurs", count: filteredInvoices.length,
      columns: ["N° Facture", "Réf fournisseur", "Fournisseur", "Statut", "Total TTC", "Payé", "Date facture", "Échéance"],
      rows: filteredInvoices.map((i) => [i.invoiceNo, i.supplierInvoiceRef || "—", i.supplierId?.name ?? "—", i.status.replace(/_/g, " "), `${tnd(i.totalTtc)} TND`, `${tnd(i.amountPaid)} TND`, fmt(i.invoiceDate), fmt(i.dueDate)]),
      filename: `factures-fournisseurs-${new Date().toISOString().slice(0, 10)}`,
    };
    return {
      title: "Documents Achats — Bons de retour", count: filteredReturns.length,
      columns: ["N° Retour", "Fournisseur", "N° Réception", "Motif", "Statut", "Total TTC", "Date"],
      rows: filteredReturns.map((r) => [r.returnNo, r.supplierId?.name ?? "—", r.purchaseReceiptId?.receiptNo ?? "—", r.reason, r.status.replace(/_/g, " "), `${tnd(r.totalTtc)} TND`, fmt(r.createdAt)]),
      filename: `retours-achat-${new Date().toISOString().slice(0, 10)}`,
    };
  };

  const handlePdf = async () => {
    setExporting(true);
    const d = getExportData();
    try { await exportToPdf(d.title, `${d.count} enregistrement(s)`, d.columns, d.rows, d.filename + ".pdf"); }
    finally { setExporting(false); }
  };
  const handleCsv = () => { const d = getExportData(); exportToCsv(d.columns, d.rows, d.filename + ".csv"); };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; count: number }[] = [
    { key: "commandes",  label: "Commandes",  icon: ShoppingCart, count: orders.length },
    { key: "receptions", label: "Réceptions", icon: Truck,        count: receipts.length },
    { key: "factures",   label: "Factures",   icon: Receipt,      count: invoices.length },
    { key: "retours",    label: "Retours",    icon: RotateCcw,    count: returns.length },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <FileText size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Documents</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Archive des documents du module achats</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">{error}</div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => { setTab(key); setSearch(""); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-medium transition ${tab === key ? "bg-white shadow text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <Icon size={13} />{label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === key ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>{count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
              />
            </div>
            <button onClick={handlePdf} disabled={exporting}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
            </button>
            <button onClick={handleCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Chargement...</div>
        ) : tab === "commandes" ? (
          <div className={`${surface} overflow-hidden`}><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  <th className={thCls}>N° Commande</th><th className={thCls}>Fournisseur</th><th className={thCls}>Statut</th>
                  <th className={thCls}>Total TTC</th><th className={thCls}>Date création</th><th className={thCls}>Date validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Aucune commande trouvée</td></tr>
                : filteredOrders.map((o) => (
                  <tr key={o._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{o.orderNo}</td>
                    <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{o.supplierId?.name ?? "—"}</td>
                    <td className={tdCls}><Badge status={o.status} /></td>
                    <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(o.totalTtc)} TND</td>
                    <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(o.createdAt)}</td>
                    <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(o.validatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : tab === "receptions" ? (
          <div className={`${surface} overflow-hidden`}><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  <th className={thCls}>N° Bon</th><th className={thCls}>Fournisseur</th><th className={thCls}>N° Commande</th>
                  <th className={thCls}>Dépôt</th><th className={thCls}>Statut</th><th className={thCls}>Lignes</th><th className={thCls}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReceipts.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Aucun bon de réception trouvé</td></tr>
                : filteredReceipts.map((r) => (
                  <tr key={r._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{r.receiptNo}</td>
                    <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{r.supplierId?.name ?? "—"}</td>
                    <td className={`${tdCls} font-mono text-xs text-slate-500`}>{r.purchaseOrderId?.orderNo ?? "—"}</td>
                    <td className={`${tdCls} text-xs text-slate-500`}>{r.depotId?.name ?? "—"}</td>
                    <td className={tdCls}><Badge status={r.receiptStatus} /></td>
                    <td className={`${tdCls} text-slate-600 dark:text-slate-300`}>{r.lines?.length ?? 0} ligne{(r.lines?.length ?? 0) !== 1 ? "s" : ""}</td>
                    <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : tab === "factures" ? (
          <div className={`${surface} overflow-hidden`}><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  <th className={thCls}>N° Facture</th><th className={thCls}>Réf fournisseur</th><th className={thCls}>Fournisseur</th>
                  <th className={thCls}>Statut</th><th className={thCls}>Total TTC</th><th className={thCls}>Payé</th>
                  <th className={thCls}>Date facture</th><th className={thCls}>Échéance</th><th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">Aucune facture trouvée</td></tr>
                : filteredInvoices.map((i) => (
                  <tr key={i._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{i.invoiceNo}</td>
                    <td className={`${tdCls} text-xs text-slate-500`}>{i.supplierInvoiceRef || "—"}</td>
                    <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{i.supplierId?.name ?? "—"}</td>
                    <td className={tdCls}><Badge status={i.status} /></td>
                    <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(i.totalTtc)} TND</td>
                    <td className={`${tdCls} tabular-nums ${i.amountPaid >= i.totalTtc ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{tnd(i.amountPaid)} TND</td>
                    <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(i.invoiceDate)}</td>
                    <td className={`${tdCls} text-xs ${i.status !== "PAID" && new Date(i.dueDate) < new Date() ? "text-rose-500 font-medium" : "text-slate-400"} whitespace-nowrap`}>{fmt(i.dueDate)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        title="Imprimer"
                        onClick={() => void printInvoiceTemplate({
                          docType: "FACTURE FOURNISSEUR",
                          companyRole: "ACHETEUR",
                          invoiceNo: i.invoiceNo,
                          invoiceDate: i.invoiceDate,
                          dueDate: i.dueDate,
                          orderNo: i.purchaseOrderId?.orderNo ?? null,
                          paymentStatus: i.status,
                          company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, bank: settings.bank, agence: settings.agence } : undefined,
                          party: { label: "FOURNISSEUR", name: i.supplierId?.name ?? "—" },
                          subtotalHt: i.subtotalHt, fodecRate: i.fodecRate, totalFodec: i.totalFodec,
                          tvaRate: i.tvaRate, totalVat: i.totalVat, totalBeforeStamp: i.totalBeforeStamp,
                          timbreFiscal: i.timbreFiscal, totalTtc: i.totalTtc, amountPaid: i.amountPaid,
                        }, `${i.invoiceNo}.pdf`)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <Printer size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : (
          <div className={`${surface} overflow-hidden`}><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  <th className={thCls}>N° Retour</th><th className={thCls}>Fournisseur</th><th className={thCls}>N° Réception</th>
                  <th className={thCls}>Motif</th><th className={thCls}>Statut</th><th className={thCls}>Total TTC</th><th className={thCls}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReturns.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Aucun retour trouvé</td></tr>
                : filteredReturns.map((r) => (
                  <tr key={r._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{r.returnNo}</td>
                    <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{r.supplierId?.name ?? "—"}</td>
                    <td className={`${tdCls} font-mono text-xs text-slate-500`}>{r.purchaseReceiptId?.receiptNo ?? "—"}</td>
                    <td className={`${tdCls} max-w-[180px] truncate text-xs text-slate-500`}>{r.reason}</td>
                    <td className={tdCls}><Badge status={r.status} /></td>
                    <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(r.totalTtc)} TND</td>
                    <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        )}
      </div>
    </ProtectedRoute>
  );
}
