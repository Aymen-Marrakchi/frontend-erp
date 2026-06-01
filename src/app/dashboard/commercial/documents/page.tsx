"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { devisService, type Devis } from "@/services/commercial/devisService";
import { salesOrderService, type SalesOrder } from "@/services/commercial/salesOrderService";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useEffect, useState } from "react";
import {
  FileText, Loader2, FileCheck, ShoppingBag, Receipt,
  Download, Printer, DollarSign, FileSpreadsheet, Clock,
} from "lucide-react";
import { financeService, type CompanySettings } from "@/services/finance/financeService";
import { exportToPdf, exportToCsv, printInvoiceTemplate } from "@/lib/pdfExport";

const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const tnd = (v: number) =>
  v.toLocaleString("fr-TN", { minimumFractionDigits: 3 });

const monthLabel = () =>
  new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase();

interface ExportEntry { label: string; filename: string; at: string }

interface ReportCard {
  key: string;
  icon: React.ReactNode;
  iconBg: string;
  badge: string;
  badgeColor: string;
  title: string;
  description: string;
  pdfColor: string;
  onPdf: () => Promise<void>;
  onCsv: () => void;
}

export default function CommercialDocumentsPage() {
  const [devis, setDevis]       = useState<Devis[]>([]);
  const [orders, setOrders]     = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<ExportEntry[]>([]);

  useEffect(() => {
    setLoading(true);
    financeService.getSettings().then(setSettings).catch(() => {});
    Promise.all([devisService.getAll(), salesOrderService.getAll(), customerInvoiceService.getAll()])
      .then(([d, o, i]) => { setDevis(d); setOrders(o); setInvoices(i); })
      .catch((e) => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const logExport = (label: string, filename: string) => {
    setExportLog((prev) => [
      { label, filename, at: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) },
      ...prev,
    ]);
  };

  const totalRevenue = invoices.reduce((s, i) => s + (i.totalTtc ?? 0), 0);

  const makeDevisPdf = async () => {
    setExporting("devis-pdf");
    const cols = ["N° Devis", "Client", "Statut", "Total TTC", "Date"];
    const rows = devis.map((d) => [d.devisNo, d.customerName, d.status.replace(/_/g, " "), `${tnd(d.totalTtc)} TND`, fmt(d.issueDate)]);
    const filename = `devis-${new Date().toISOString().slice(0, 10)}.pdf`;
    try { await exportToPdf("Devis", `${devis.length} enregistrement(s)`, cols, rows, filename); logExport("Devis — PDF", filename); }
    finally { setExporting(null); }
  };
  const makeDevisCsv = () => {
    const cols = ["N° Devis", "Client", "Statut", "Total TTC", "Date"];
    const rows = devis.map((d) => [d.devisNo, d.customerName, d.status.replace(/_/g, " "), `${tnd(d.totalTtc)} TND`, fmt(d.issueDate)]);
    const filename = `devis-${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(cols, rows, filename); logExport("Devis — CSV", filename);
  };

  const makeCommandesPdf = async () => {
    setExporting("commandes-pdf");
    const cols = ["N° Commande", "Client", "Statut", "Lignes", "Date"];
    const rows = orders.map((o) => [o.orderNo, o.customerName ?? "—", o.status.replace(/_/g, " "), o.lines?.length ?? 0, fmt(o.createdAt)]);
    const filename = `commandes-${new Date().toISOString().slice(0, 10)}.pdf`;
    try { await exportToPdf("Commandes client", `${orders.length} enregistrement(s)`, cols, rows, filename); logExport("Commandes — PDF", filename); }
    finally { setExporting(null); }
  };
  const makeCommandesCsv = () => {
    const cols = ["N° Commande", "Client", "Statut", "Lignes", "Date"];
    const rows = orders.map((o) => [o.orderNo, o.customerName ?? "—", o.status.replace(/_/g, " "), o.lines?.length ?? 0, fmt(o.createdAt)]);
    const filename = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(cols, rows, filename); logExport("Commandes — CSV", filename);
  };

  const makeFacturesPdf = async () => {
    setExporting("factures-pdf");
    const cols = ["N° Facture", "Client", "Statut paiement", "Total TTC", "Date"];
    const rows = invoices.map((i) => [i.invoiceNo, i.customerName, (i.paymentStatus ?? "NON_PAYEE").replace(/_/g, " "), `${tnd(i.totalTtc)} TND`, fmt(i.createdAt)]);
    const filename = `factures-${new Date().toISOString().slice(0, 10)}.pdf`;
    try { await exportToPdf("Factures client", `${invoices.length} enregistrement(s)`, cols, rows, filename); logExport("Factures — PDF", filename); }
    finally { setExporting(null); }
  };
  const makeFacturesCsv = () => {
    const cols = ["N° Facture", "Client", "Statut paiement", "Total TTC", "Date"];
    const rows = invoices.map((i) => [i.invoiceNo, i.customerName, (i.paymentStatus ?? "NON_PAYEE").replace(/_/g, " "), `${tnd(i.totalTtc)} TND`, fmt(i.createdAt)]);
    const filename = `factures-${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCsv(cols, rows, filename); logExport("Factures — CSV", filename);
  };

  const handlePrintInvoice = (i: CustomerInvoice) => {
    void printInvoiceTemplate({
      invoiceNo: i.invoiceNo, invoiceDate: i.issueDate, dueDate: i.dueDate ?? null,
      orderNo: i.salesOrderId?.orderNo ?? null, paymentMethod: i.paymentMethod, paymentStatus: i.paymentStatus,
      company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, bank: settings.bank, agence: settings.agence } : undefined,
      party: { label: "CLIENT / DESTINATAIRE", name: i.customerName, mf: i.customerMf, address: i.customerAddress },
      lines: i.lines?.map((l) => ({ ref: l.productId?.sku, description: l.productId?.name ?? "—", qty: l.quantity, unitPrice: l.inputUnitPrice, totalHt: l.subtotalHt })),
      subtotalHt: i.subtotalHt, fodecRate: i.fodecRate, totalFodec: i.totalFodec,
      tvaRate: i.tvaRate, totalVat: i.totalVat, totalBeforeStamp: i.totalBeforeStamp,
      timbreFiscal: i.timbreFiscal, totalTtc: i.totalTtc, amountPaid: i.amountPaid,
    }, `${i.invoiceNo}.pdf`);
    logExport(`Facture ${i.invoiceNo} — PDF`, `${i.invoiceNo}.pdf`);
  };

  const exportAllCsv = () => { makeDevisCsv(); makeCommandesCsv(); makeFacturesCsv(); };

  const reports: ReportCard[] = [
    {
      key: "devis",
      icon: <FileCheck size={20} />,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
      badge: "Tous les devis",
      badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
      title: "Rapport Devis",
      description: "Tous les devis avec détails client, montants, remises et statuts.",
      pdfColor: "bg-teal-600 hover:bg-teal-700",
      onPdf: makeDevisPdf,
      onCsv: makeDevisCsv,
    },
    {
      key: "commandes",
      icon: <ShoppingBag size={20} />,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
      badge: "Tous statuts",
      badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
      title: "Rapport Commandes",
      description: "Commandes clients avec lignes, dates de livraison promise et progression.",
      pdfColor: "bg-teal-600 hover:bg-teal-700",
      onPdf: makeCommandesPdf,
      onCsv: makeCommandesCsv,
    },
    {
      key: "factures",
      icon: <Receipt size={20} />,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
      badge: "Tous statuts paiement",
      badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
      title: "Rapport Factures",
      description: "Factures clients avec FODEC, TVA, timbre fiscal et totaux TTC.",
      pdfColor: "bg-teal-600 hover:bg-teal-700",
      onPdf: makeFacturesPdf,
      onCsv: makeFacturesCsv,
    },
  ];

  const statCards = [
    {
      label: "TOTAL RAPPORTS", value: "3", sub: "Disponibles",
      icon: <FileText size={18} />,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
    },
    {
      label: "GÉNÉRÉS", value: String(exportLog.length), sub: "Cette session",
      icon: <Download size={18} />,
      iconBg: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    },
    {
      label: "TOTAL DOCUMENTS", value: String(devis.length + orders.length + invoices.length), sub: "Tous statuts",
      icon: <ShoppingBag size={18} />,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
    },
    {
      label: "TOTAL REVENUE", value: tnd(totalRevenue), sub: "TND — Factures",
      icon: <DollarSign size={18} />,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
      large: true,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Commercial <span className="text-teal-500">Reports</span>
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              EMM ERP · COMMERCIAL
            </p>
          </div>
          <button
            onClick={exportAllCsv}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-teal-700"
          >
            <Download size={15} /> Export All CSV
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Chargement...
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((card, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconBg}`}>
                    {card.icon}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{card.label}</p>
                  {card.large ? (
                    <p className="mt-1 text-xl font-bold leading-tight text-slate-950 dark:text-white">
                      {card.value}<br /><span className="text-sm font-semibold text-slate-500">TND</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{card.value}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Report cards + export log */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

              <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2 content-start">
                {reports.map((r) => {
                  const isPdfLoading = exporting === `${r.key}-pdf`;
                  return (
                    <div key={r.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${r.iconBg}`}>{r.icon}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${r.badgeColor}`}>{r.badge}</span>
                      </div>
                      <h3 className="font-bold text-slate-950 dark:text-white">{r.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{r.description}</p>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{monthLabel()}</p>
                      <div className="mt-4 flex gap-2">
                        <button onClick={r.onPdf} disabled={!!exporting}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 ${r.pdfColor}`}
                        >
                          {isPdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export PDF
                        </button>
                        <button onClick={r.onCsv} disabled={!!exporting}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Download size={12} /> Export CSV
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Per-invoice print card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-2">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                      <Printer size={20} />
                    </div>
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                      Impression individuelle
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-950 dark:text-white">Imprimer une facture</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Sélectionnez une facture pour générer le PDF Tunisien complet (FODEC · TVA · Timbre fiscal).
                  </p>
                  <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100 dark:border-slate-800 dark:divide-slate-800">
                    {invoices.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">Aucune facture</p>
                    ) : invoices.map((i) => (
                      <div key={i._id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{i.invoiceNo}</p>
                          <p className="text-[10px] text-slate-400">{i.customerName} · {tnd(i.totalTtc)} TND</p>
                        </div>
                        <button onClick={() => handlePrintInvoice(i)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Printer size={10} /> PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Export log */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-fit">
                <p className="text-base font-bold text-slate-950 dark:text-white">Export Log</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Cette session</p>
                <div className="mt-5">
                  {exportLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <FileSpreadsheet size={16} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">No exports yet</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">Files appear here after download</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {exportLog.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                            <Download size={11} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">{entry.label}</p>
                            <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{entry.filename}</p>
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={9} /> {entry.at}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
