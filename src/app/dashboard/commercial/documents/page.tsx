"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { devisService, type Devis } from "@/services/commercial/devisService";
import { salesOrderService, type SalesOrder } from "@/services/commercial/salesOrderService";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useEffect, useState } from "react";
import { FileText, Loader2, Search, FileCheck, ShoppingBag, Receipt, Download, Printer } from "lucide-react";
import { financeService, type CompanySettings } from "@/services/finance/financeService";
import { exportToPdf, exportToCsv, printInvoiceTemplate } from "@/lib/pdfExport";

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  SENT:       "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  ACCEPTED:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED:   "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  CANCELLED:  "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  DRAFT:      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  CONFIRMED:  "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  ORDONNANCED:"bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  PREPARED:   "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  SHIPPED:    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  DELIVERED:  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  RETURNED:   "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  CLOSED:     "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  NON_PAYEE:            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  PARTIELLEMENT_PAYEE:  "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PENDING_CHEQUE:       "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  PAYEE:                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
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

type Tab = "devis" | "commandes" | "factures";

export default function CommercialDocumentsPage() {
  const [tab, setTab]           = useState<Tab>("devis");
  const [devis, setDevis]       = useState<Devis[]>([]);
  const [orders, setOrders]     = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    setLoading(true);
    financeService.getSettings().then(setSettings).catch(() => {});
    Promise.all([
      devisService.getAll(),
      salesOrderService.getAll(),
      customerInvoiceService.getAll(),
    ])
      .then(([d, o, i]) => { setDevis(d); setOrders(o); setInvoices(i); })
      .catch((e) => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();

  const filteredDevis    = devis.filter((d) => d.devisNo.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q));
  const filteredOrders   = orders.filter((o) => o.orderNo.toLowerCase().includes(q) || (o.customerName ?? "").toLowerCase().includes(q));
  const filteredInvoices = invoices.filter((i) => i.invoiceNo.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));

  const getExportData = () => {
    if (tab === "devis") return {
      title: "Documents Commercial — Devis",
      count: filteredDevis.length,
      columns: ["N° Devis", "Client", "Statut", "Total TTC", "Date émission", "Commande liée"],
      rows: filteredDevis.map((d) => [
        d.devisNo, d.customerName, d.status.replace(/_/g, " "),
        `${d.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        fmt(d.issueDate), d.salesOrderId?.orderNo ?? "—",
      ]) as (string | number)[][],
      filename: `devis-${new Date().toISOString().slice(0, 10)}`,
    };
    if (tab === "commandes") return {
      title: "Documents Commercial — Commandes client",
      count: filteredOrders.length,
      columns: ["N° Commande", "Client", "Statut", "Lignes", "Date création", "Livraison promise"],
      rows: filteredOrders.map((o) => [
        o.orderNo, o.customerName ?? "—", o.status.replace(/_/g, " "),
        o.lines?.length ?? 0, fmt(o.createdAt), fmt(o.promisedDate),
      ]) as (string | number)[][],
      filename: `commandes-client-${new Date().toISOString().slice(0, 10)}`,
    };
    return {
      title: "Documents Commercial — Factures client",
      count: filteredInvoices.length,
      columns: ["N° Facture", "Client", "Statut paiement", "Total TTC", "Commande", "Date"],
      rows: filteredInvoices.map((i) => [
        i.invoiceNo, i.customerName, (i.paymentStatus ?? "NON_PAYEE").replace(/_/g, " "),
        `${i.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        i.salesOrderId?.orderNo ?? "—", fmt(i.createdAt),
      ]) as (string | number)[][],
      filename: `factures-client-${new Date().toISOString().slice(0, 10)}`,
    };
  };

  const handlePdf = async () => {
    setExporting(true);
    const d = getExportData();
    try {
      await exportToPdf(d.title, `${d.count} enregistrement(s)`, d.columns, d.rows, `${d.filename}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    const d = getExportData();
    exportToCsv(d.columns, d.rows, `${d.filename}.csv`);
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; count: number }[] = [
    { key: "devis",     label: "Devis",     icon: FileCheck,   count: devis.length },
    { key: "commandes", label: "Commandes", icon: ShoppingBag, count: orders.length },
    { key: "factures",  label: "Factures",  icon: Receipt,     count: invoices.length },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <FileText size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Documents</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Archive des documents du module commercial</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Tabs + Search + Export */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setSearch(""); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-medium transition ${tab === key ? "bg-white shadow text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <Icon size={13} />
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === key ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
              />
            </div>
            <button
              onClick={handlePdf}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              PDF
            </button>
            <button
              onClick={handleCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Chargement...
          </div>
        ) : tab === "devis" ? (
          <div className={`${surface} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className={thCls}>N° Devis</th>
                    <th className={thCls}>Client</th>
                    <th className={thCls}>Statut</th>
                    <th className={thCls}>Total TTC</th>
                    <th className={thCls}>Date émission</th>
                    <th className={thCls}>Commande liée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDevis.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Aucun devis trouvé</td></tr>
                  ) : filteredDevis.map((d) => (
                    <tr key={d._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{d.devisNo}</td>
                      <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{d.customerName}</td>
                      <td className={tdCls}><Badge status={d.status} /></td>
                      <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(d.totalTtc)} TND</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(d.issueDate)}</td>
                      <td className={`${tdCls} font-mono text-xs text-slate-500`}>{d.salesOrderId?.orderNo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        ) : tab === "commandes" ? (
          <div className={`${surface} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className={thCls}>N° Commande</th>
                    <th className={thCls}>Client</th>
                    <th className={thCls}>Statut</th>
                    <th className={thCls}>Lignes</th>
                    <th className={thCls}>Date création</th>
                    <th className={thCls}>Date livraison promise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Aucune commande trouvée</td></tr>
                  ) : filteredOrders.map((o) => (
                    <tr key={o._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{o.orderNo}</td>
                      <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{o.customerName}</td>
                      <td className={tdCls}><Badge status={o.status} /></td>
                      <td className={`${tdCls} text-slate-600 dark:text-slate-300`}>{o.lines?.length ?? 0} ligne{(o.lines?.length ?? 0) !== 1 ? "s" : ""}</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(o.createdAt)}</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(o.promisedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        ) : (
          <div className={`${surface} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className={thCls}>N° Facture</th>
                    <th className={thCls}>Client</th>
                    <th className={thCls}>Statut paiement</th>
                    <th className={thCls}>Total TTC</th>
                    <th className={thCls}>Commande</th>
                    <th className={thCls}>Date</th>
                    <th className="w-10 px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Aucune facture trouvée</td></tr>
                  ) : filteredInvoices.map((i) => (
                    <tr key={i._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{i.invoiceNo}</td>
                      <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{i.customerName}</td>
                      <td className={tdCls}><Badge status={i.paymentStatus ?? "NON_PAYEE"} /></td>
                      <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(i.totalTtc)} TND</td>
                      <td className={`${tdCls} font-mono text-xs text-slate-500`}>{i.salesOrderId?.orderNo ?? "—"}</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(i.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          title="Imprimer"
                          onClick={() => void printInvoiceTemplate({
                            invoiceNo: i.invoiceNo,
                            invoiceDate: i.issueDate,
                            dueDate: i.dueDate ?? null,
                            orderNo: i.salesOrderId?.orderNo ?? null,
                            paymentMethod: i.paymentMethod,
                            paymentStatus: i.paymentStatus,
                            company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, bank: settings.bank, agence: settings.agence } : undefined,
                            party: { label: "CLIENT / DESTINATAIRE", name: i.customerName, mf: i.customerMf, address: i.customerAddress },
                            lines: i.lines?.map((l) => ({ ref: l.productId?.sku, description: l.productId?.name ?? "—", qty: l.quantity, unitPrice: l.inputUnitPrice, totalHt: l.subtotalHt })),
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
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
