"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { purchaseOrderService, type PurchaseOrder } from "@/services/purchase/purchaseOrderService";
import { purchaseReceiptService, type PurchaseReceipt } from "@/services/purchase/purchaseReceiptService";
import { purchaseInvoiceService, type PurchaseInvoice } from "@/services/purchase/purchaseInvoiceService";
import { purchaseReturnService, type PurchaseReturn } from "@/services/purchase/purchaseReturnService";
import { useEffect, useState } from "react";
import { FileText, Loader2, ShoppingCart, Truck, Receipt, RotateCcw, Download, Printer, Clock, TrendingDown } from "lucide-react";
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
const card = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

type ExportEntry = { label: string; format: "PDF" | "CSV"; ts: Date };

export default function AchatDocumentsPage() {
  const [orders, setOrders]     = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [returns, setReturns]   = useState<PurchaseReturn[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<ExportEntry[]>([]);

  useEffect(() => {
    setLoading(true);
    financeService.getSettings().then(setSettings).catch(() => {});
    Promise.all([
      purchaseOrderService.getAll(),
      purchaseReceiptService.getAll(),
      purchaseInvoiceService.getAll(),
      purchaseReturnService.getAll(),
    ])
      .then(([ord, rec, inv, ret]) => { setOrders(ord); setReceipts(rec); setInvoices(inv); setReturns(ret); })
      .catch((e) => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const log = (label: string, format: "PDF" | "CSV") =>
    setExportLog((prev) => [{ label, format, ts: new Date() }, ...prev]);

  const handleExportOrders = async (format: "PDF" | "CSV") => {
    const cols = ["N° Commande", "Fournisseur", "Statut", "Total TTC", "Date création", "Date validation"];
    const rows = orders.map((o) => [o.orderNo, o.supplierId?.name ?? "—", o.status.replace(/_/g, " "), `${tnd(o.totalTtc)} TND`, fmt(o.createdAt), fmt(o.validatedAt)]) as (string | number)[][];
    const filename = `commandes-achat-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") { exportToCsv(cols, rows, `${filename}.csv`); }
    else { setExporting("orders-pdf"); try { await exportToPdf("Bons de commande", `${orders.length} commande(s)`, cols, rows, `${filename}.pdf`); } finally { setExporting(null); } }
    log("Bons de commande", format);
  };

  const handleExportReceipts = async (format: "PDF" | "CSV") => {
    const cols = ["N° Bon", "Fournisseur", "N° Commande", "Dépôt", "Statut", "Lignes", "Date"];
    const rows = receipts.map((r) => [r.receiptNo, r.supplierId?.name ?? "—", r.purchaseOrderId?.orderNo ?? "—", r.depotId?.name ?? "—", r.receiptStatus, r.lines?.length ?? 0, fmt(r.createdAt)]) as (string | number)[][];
    const filename = `receptions-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") { exportToCsv(cols, rows, `${filename}.csv`); }
    else { setExporting("receipts-pdf"); try { await exportToPdf("Bons de réception", `${receipts.length} réception(s)`, cols, rows, `${filename}.pdf`); } finally { setExporting(null); } }
    log("Bons de réception", format);
  };

  const handleExportInvoices = async (format: "PDF" | "CSV") => {
    const cols = ["N° Facture", "Réf fournisseur", "Fournisseur", "Statut", "Total TTC", "Payé", "Date facture", "Échéance"];
    const rows = invoices.map((i) => [i.invoiceNo, i.supplierInvoiceRef || "—", i.supplierId?.name ?? "—", i.status.replace(/_/g, " "), `${tnd(i.totalTtc)} TND`, `${tnd(i.amountPaid)} TND`, fmt(i.invoiceDate), fmt(i.dueDate)]) as (string | number)[][];
    const filename = `factures-fournisseurs-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") { exportToCsv(cols, rows, `${filename}.csv`); }
    else { setExporting("invoices-pdf"); try { await exportToPdf("Factures fournisseurs", `${invoices.length} facture(s)`, cols, rows, `${filename}.pdf`); } finally { setExporting(null); } }
    log("Factures fournisseurs", format);
  };

  const handleExportReturns = async (format: "PDF" | "CSV") => {
    const cols = ["N° Retour", "Fournisseur", "N° Réception", "Motif", "Statut", "Total TTC", "Date"];
    const rows = returns.map((r) => [r.returnNo, r.supplierId?.name ?? "—", r.purchaseReceiptId?.receiptNo ?? "—", r.reason, r.status.replace(/_/g, " "), `${tnd(r.totalTtc)} TND`, fmt(r.createdAt)]) as (string | number)[][];
    const filename = `retours-achat-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") { exportToCsv(cols, rows, `${filename}.csv`); }
    else { setExporting("returns-pdf"); try { await exportToPdf("Bons de retour", `${returns.length} retour(s)`, cols, rows, `${filename}.pdf`); } finally { setExporting(null); } }
    log("Retours", format);
  };

  const handleExportAll = () => {
    handleExportOrders("CSV");
    handleExportReceipts("CSV");
    handleExportInvoices("CSV");
    handleExportReturns("CSV");
  };

  const totalDocs = orders.length + receipts.length + invoices.length + returns.length;
  const totalTtc = orders.reduce((s, o) => s + o.totalTtc, 0) + invoices.reduce((s, i) => s + i.totalTtc, 0);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40">
              <FileText size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Purchase <span className="text-teal-600 dark:text-teal-400">Reports</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Commandes, réceptions, factures et retours</p>
            </div>
          </div>
          <button
            onClick={handleExportAll}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 active:scale-95"
          >
            <Download size={14} />
            Export All CSV
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total Rapports", value: "4",              sub: "types disponibles",    icon: FileText },
                { label: "Générés",        value: String(exportLog.length), sub: "cette session", icon: Download },
                { label: "Total Documents",value: String(totalDocs),sub: "entrées en base",       icon: ShoppingCart },
                { label: "Total TTC",      value: `${tnd(totalTtc)} TND`, sub: "commandes + factures", icon: TrendingDown },
              ].map(({ label, value, sub, icon: Icon }) => (
                <div key={label} className={`${card} p-5`}>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                    <Icon size={16} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Main grid */}
            <div className="grid gap-6 lg:grid-cols-3">

              {/* Report cards — 2 cols */}
              <div className="space-y-5 lg:col-span-2">

                {/* Bons de commande */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <ShoppingCart size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Bons de commande</p>
                        <p className="text-xs text-slate-400">{orders.length} commande(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportOrders("PDF")}
                        disabled={exporting === "orders-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "orders-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportOrders("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {orders.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune commande</p>
                    ) : orders.slice(0, 5).map((o) => (
                      <div key={o._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{o.orderNo}</p>
                          <p className="text-xs text-slate-400">{o.supplierId?.name ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={o.status} />
                          <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{tnd(o.totalTtc)} TND</p>
                        </div>
                      </div>
                    ))}
                    {orders.length > 5 && (
                      <p className="px-5 py-2 text-center text-xs text-slate-400">+{orders.length - 5} autres commandes</p>
                    )}
                  </div>
                </div>

                {/* Bons de réception */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <Truck size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Bons de réception</p>
                        <p className="text-xs text-slate-400">{receipts.length} réception(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportReceipts("PDF")}
                        disabled={exporting === "receipts-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "receipts-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportReceipts("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {receipts.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune réception</p>
                    ) : receipts.slice(0, 5).map((r) => (
                      <div key={r._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{r.receiptNo}</p>
                          <p className="text-xs text-slate-400">{r.supplierId?.name ?? "—"} — {r.purchaseOrderId?.orderNo ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={r.receiptStatus} />
                          <p className="text-xs text-slate-400">{fmt(r.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    {receipts.length > 5 && (
                      <p className="px-5 py-2 text-center text-xs text-slate-400">+{receipts.length - 5} autres réceptions</p>
                    )}
                  </div>
                </div>

                {/* Factures fournisseurs */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <Receipt size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Factures fournisseurs</p>
                        <p className="text-xs text-slate-400">{invoices.length} facture(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportInvoices("PDF")}
                        disabled={exporting === "invoices-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "invoices-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportInvoices("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                    {invoices.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune facture</p>
                    ) : invoices.map((i) => (
                      <div key={i._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{i.invoiceNo}</p>
                          <p className="text-xs text-slate-400">{i.supplierId?.name ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{tnd(i.totalTtc)} TND</p>
                            <Badge status={i.status} />
                          </div>
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
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retours */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <RotateCcw size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Retours fournisseurs</p>
                        <p className="text-xs text-slate-400">{returns.length} retour(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportReturns("PDF")}
                        disabled={exporting === "returns-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "returns-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportReturns("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {returns.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucun retour</p>
                    ) : returns.slice(0, 5).map((r) => (
                      <div key={r._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{r.returnNo}</p>
                          <p className="text-xs text-slate-400">{r.supplierId?.name ?? "—"} — {r.purchaseReceiptId?.receiptNo ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={r.status} />
                          <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{tnd(r.totalTtc)} TND</p>
                        </div>
                      </div>
                    ))}
                    {returns.length > 5 && (
                      <p className="px-5 py-2 text-center text-xs text-slate-400">+{returns.length - 5} autres retours</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Export Log sidebar */}
              <div className={`${card} flex flex-col overflow-hidden`}>
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <Clock size={14} className="text-teal-600 dark:text-teal-400" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Export Log</p>
                  <span className="ml-auto rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                    {exportLog.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                  {exportLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                      <Download size={22} className="opacity-30" />
                      <p className="text-xs">Aucun export cette session</p>
                    </div>
                  ) : exportLog.map((entry, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{entry.label}</p>
                        <p className="text-[10px] text-slate-400">
                          {entry.ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.format === "PDF" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400" : "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"}`}>
                        {entry.format}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
