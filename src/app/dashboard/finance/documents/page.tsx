"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import {
  financeService,
  type CompanySettings,
  type FinanceEntry,
  type ManualJournalEntry,
  type FinancePayable,
  type FinanceReceivable,
} from "@/services/finance/financeService";
import { useEffect, useState } from "react";
import { FileText, Loader2, Download, Printer, BookOpen, BookMarked, Receipt, TrendingUp, Clock } from "lucide-react";
import { exportToPdf, exportToCsv, openFournisseurDocument, openClientDocument } from "@/lib/pdfExport";

const STATUS_COLORS: Record<string, string> = {
  OPEN:                "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  SETTLED:             "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  APPROVED:            "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  PARTIALLY_PAID:      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PAID:                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  SHIPPED:             "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  DELIVERED:           "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  CLOSED:              "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  NON_PAYEE:           "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  PARTIELLEMENT_PAYEE: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PENDING_CHEQUE:      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  PAYEE:               "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function StatusBadge({ status }: { status: string }) {
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

export default function FinanceDocumentsPage() {
  const [entries, setEntries]         = useState<FinanceEntry[]>([]);
  const [manual, setManual]           = useState<ManualJournalEntry[]>([]);
  const [payables, setPayables]       = useState<FinancePayable[]>([]);
  const [receivables, setReceivables] = useState<FinanceReceivable[]>([]);
  const [settings, setSettings]       = useState<CompanySettings | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [exporting, setExporting]     = useState<string | null>(null);
  const [exportLog, setExportLog]     = useState<ExportEntry[]>([]);

  useEffect(() => {
    setLoading(true);
    financeService.getSettings().then(setSettings).catch(() => {});
    Promise.all([
      financeService.getEntries(),
      financeService.getManualEntries(),
      financeService.getPayables(),
      financeService.getReceivables(),
    ])
      .then(([e, m, p, r]) => { setEntries(e); setManual(m); setPayables(p); setReceivables(r); })
      .catch((err) => setError(err?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const log = (label: string, format: "PDF" | "CSV") =>
    setExportLog((prev) => [{ label, format, ts: new Date() }, ...prev]);

  const handleExportEntries = async (format: "PDF" | "CSV") => {
    const cols = ["Référence", "Type", "Module", "Contrepartie", "Sens", "Montant", "Statut", "Date"];
    const rows = entries.map((e) => [
      e.reference || "—", e.entryType.replace(/_/g, " "), e.sourceModule,
      e.counterpartyName || "—", e.direction,
      `${e.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
      e.status, fmt(e.occurredAt),
    ]) as (string | number)[][];
    const filename = `ecritures-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") {
      exportToCsv(cols, rows, `${filename}.csv`);
    } else {
      setExporting("ecritures-pdf");
      try { await exportToPdf("Écritures comptables", `${entries.length} écriture(s)`, cols, rows, `${filename}.pdf`); }
      finally { setExporting(null); }
    }
    log("Écritures comptables", format);
  };

  const handleExportManual = async (format: "PDF" | "CSV") => {
    const cols = ["Référence", "Description", "Lignes", "Total débit", "Date comptable", "Créé le"];
    const rows = manual.map((m) => {
      const totalDebit = m.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + l.amount, 0);
      return [
        m.reference, m.description || "—", m.lines.length,
        `${totalDebit.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        fmt(m.occurredAt), fmt(m.createdAt),
      ];
    }) as (string | number)[][];
    const filename = `journal-manuel-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") {
      exportToCsv(cols, rows, `${filename}.csv`);
    } else {
      setExporting("journal-pdf");
      try { await exportToPdf("Journal manuel", `${manual.length} saisie(s)`, cols, rows, `${filename}.pdf`); }
      finally { setExporting(null); }
    }
    log("Journal manuel", format);
  };

  const handleExportPayables = async (format: "PDF" | "CSV") => {
    const cols = ["N° Facture", "Fournisseur", "Statut", "Total TTC", "Payé", "Restant dû", "Échéance", "Correspondance"];
    const rows = payables.map((p) => [
      p.invoiceNo, p.supplierName, p.status.replace(/_/g, " "),
      `${p.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
      `${p.amountPaid.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
      `${p.outstanding.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
      fmt(p.dueDate), p.matchingStatus,
    ]) as (string | number)[][];
    const filename = `factures-fournisseurs-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") {
      exportToCsv(cols, rows, `${filename}.csv`);
    } else {
      setExporting("payables-pdf");
      try { await exportToPdf("Factures fournisseurs", `${payables.length} facture(s)`, cols, rows, `${filename}.pdf`); }
      finally { setExporting(null); }
    }
    log("Factures fournisseurs", format);
  };

  const handleExportReceivables = async (format: "PDF" | "CSV") => {
    const cols = ["N° Facture", "N° Commande", "Client", "Statut", "Paiement", "Total TTC", "Date livraison"];
    const rows = receivables.map((r) => [
      r.invoiceNo || "—", r.orderNo, r.customerName,
      r.status.replace(/_/g, " "), (r.paymentStatus ?? "NON_PAYEE").replace(/_/g, " "),
      r.totalTtc != null
        ? `${r.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`
        : `${r.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
      fmt(r.deliveredAt ?? r.shippedAt),
    ]) as (string | number)[][];
    const filename = `factures-clients-${new Date().toISOString().slice(0, 10)}`;
    if (format === "CSV") {
      exportToCsv(cols, rows, `${filename}.csv`);
    } else {
      setExporting("receivables-pdf");
      try { await exportToPdf("Factures clients", `${receivables.length} facture(s)`, cols, rows, `${filename}.pdf`); }
      finally { setExporting(null); }
    }
    log("Factures clients", format);
  };

  const handleExportAll = () => {
    handleExportEntries("CSV");
    handleExportManual("CSV");
    handleExportPayables("CSV");
    handleExportReceivables("CSV");
  };

  const totalDocs = entries.length + manual.length + payables.length + receivables.length;
  const totalTtc =
    payables.reduce((s, p) => s + p.totalTtc, 0) +
    receivables.reduce((s, r) => s + (r.totalTtc ?? r.amount), 0);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40">
              <FileText size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Finance <span className="text-teal-600 dark:text-teal-400">Reports</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Écritures, journal manuel et factures</p>
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
                { label: "Total Rapports", value: "4", sub: "types disponibles", icon: FileText, color: "teal" },
                { label: "Générés", value: String(exportLog.length), sub: "cette session", icon: Download, color: "teal" },
                { label: "Total Documents", value: String(totalDocs), sub: "entrées en base", icon: BookOpen, color: "teal" },
                { label: "Total TTC", value: `${tnd(totalTtc)} TND`, sub: "fournisseurs + clients", icon: TrendingUp, color: "teal" },
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

            {/* Main grid: report cards + export log */}
            <div className="grid gap-6 lg:grid-cols-3">

              {/* Report cards — spans 2 cols */}
              <div className="space-y-5 lg:col-span-2">

                {/* Écritures comptables */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <BookOpen size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Écritures comptables</p>
                        <p className="text-xs text-slate-400">{entries.length} écriture(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportEntries("PDF")}
                        disabled={exporting === "ecritures-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "ecritures-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportEntries("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {entries.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune écriture</p>
                    ) : entries.slice(0, 5).map((e) => (
                      <div key={e._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">{e.reference || "—"}</p>
                          <p className="text-xs text-slate-400">{e.counterpartyName || e.sourceModule}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{tnd(e.amount)} TND</p>
                          <p className="text-[10px] text-slate-400">{fmt(e.occurredAt)}</p>
                        </div>
                      </div>
                    ))}
                    {entries.length > 5 && (
                      <p className="px-5 py-2 text-center text-xs text-slate-400">+{entries.length - 5} autres écritures</p>
                    )}
                  </div>
                </div>

                {/* Journal manuel */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <BookMarked size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Journal manuel</p>
                        <p className="text-xs text-slate-400">{manual.length} saisie(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportManual("PDF")}
                        disabled={exporting === "journal-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "journal-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportManual("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {manual.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune saisie manuelle</p>
                    ) : manual.slice(0, 5).map((m) => {
                      const totalDebit = m.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + l.amount, 0);
                      return (
                        <div key={m._id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">{m.reference}</p>
                            <p className="text-xs text-slate-400">{m.description || "—"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{tnd(totalDebit)} TND</p>
                            <p className="text-[10px] text-slate-400">{fmt(m.occurredAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {manual.length > 5 && (
                      <p className="px-5 py-2 text-center text-xs text-slate-400">+{manual.length - 5} autres saisies</p>
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
                        <p className="text-xs text-slate-400">{payables.length} facture(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportPayables("PDF")}
                        disabled={exporting === "payables-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "payables-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportPayables("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                    {payables.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune facture fournisseur</p>
                    ) : payables.map((p) => (
                      <div key={p._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">{p.invoiceNo}</p>
                          <p className="text-xs text-slate-400">{p.supplierName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{tnd(p.totalTtc)} TND</p>
                            <StatusBadge status={p.status} />
                          </div>
                          <button
                            title="Imprimer"
                            onClick={() => openFournisseurDocument({
                              invoiceNo: p.invoiceNo,
                              supplierName: p.supplierName,
                              invoiceDate: p.invoiceDate,
                              dueDate: p.dueDate,
                              paymentStatus: p.status,
                              company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, iban: settings.iban, bank: settings.bank, agence: settings.agence } : undefined,
                              totalTtc: p.totalTtc,
                              amountPaid: p.amountPaid,
                            })}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Factures clients */}
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40">
                        <Receipt size={15} className="text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Factures clients</p>
                        <p className="text-xs text-slate-400">{receivables.length} facture(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportReceivables("PDF")}
                        disabled={exporting === "receivables-pdf"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        {exporting === "receivables-pdf" ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                        PDF
                      </button>
                      <button
                        onClick={() => handleExportReceivables("CSV")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
                      >
                        <Download size={11} />
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                    {receivables.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-slate-400">Aucune facture client</p>
                    ) : receivables.map((r) => (
                      <div key={r._id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">{r.invoiceNo || r.orderNo}</p>
                          <p className="text-xs text-slate-400">{r.customerName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {tnd(r.totalTtc ?? r.amount)} TND
                            </p>
                            <StatusBadge status={r.paymentStatus ?? "NON_PAYEE"} />
                          </div>
                          <button
                            title="Imprimer"
                            onClick={() => openClientDocument({
                              invoiceNo: r.invoiceNo || r.orderNo,
                              orderNo: r.orderNo,
                              customerName: r.customerName,
                              paymentStatus: r.paymentStatus,
                              paymentMethod: r.paymentMethod,
                              company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, iban: settings.iban, bank: settings.bank, agence: settings.agence } : undefined,
                              totalTtc: r.totalTtc ?? r.amount,
                              amountPaid: r.amountPaid,
                            })}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/20 dark:hover:text-teal-400"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Export Log sidebar */}
              <div className={`${card} flex flex-col overflow-hidden`} style={{ maxHeight: "fit-content" }}>
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
