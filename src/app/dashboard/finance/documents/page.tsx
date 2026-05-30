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
import { FileText, Loader2, Search, BookOpen, BookMarked, Receipt, Download, Printer } from "lucide-react";
import { exportToPdf, exportToCsv, printInvoiceTemplate } from "@/lib/pdfExport";

const ENTRY_TYPE_COLORS: Record<string, string> = {
  PAYABLE_RECORDED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  PAYABLE_PAYMENT:  "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  PAYABLE_CREDIT:   "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  INVOICE_ISSUED:   "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  REGLEMENT_RECU:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  MANUAL_ENTRY:     "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
};

const DIRECTION_COLORS: Record<string, string> = {
  INFLOW:  "text-emerald-600 dark:text-emerald-400",
  OUTFLOW: "text-rose-600 dark:text-rose-400",
  NONE:    "text-slate-400",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN:                 "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  SETTLED:              "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  INFO:                 "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  APPROVED:             "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  PARTIALLY_PAID:       "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PAID:                 "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  SHIPPED:              "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  DELIVERED:            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  CLOSED:               "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  NON_PAYEE:            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  PARTIELLEMENT_PAYEE:  "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  PENDING_CHEQUE:       "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  PAYEE:                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function EntryBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ENTRY_TYPE_COLORS[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

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

const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const thCls = "px-5 py-3 font-medium";
const tdCls = "px-5 py-3";

type Tab = "ecritures" | "journal" | "factures";
type FacturesSubTab = "fournisseurs" | "clients";

export default function FinanceDocumentsPage() {
  const [tab, setTab]               = useState<Tab>("ecritures");
  const [facturesTab, setFacturesTab] = useState<FacturesSubTab>("fournisseurs");
  const [entries, setEntries]       = useState<FinanceEntry[]>([]);
  const [manual, setManual]         = useState<ManualJournalEntry[]>([]);
  const [payables, setPayables]     = useState<FinancePayable[]>([]);
  const [receivables, setReceivables] = useState<FinanceReceivable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [exporting, setExporting]   = useState(false);
  const [settings, setSettings]     = useState<CompanySettings | null>(null);

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

  const q = search.toLowerCase();

  const filteredEntries    = entries.filter(
    (e) => e.reference.toLowerCase().includes(q) || e.counterpartyName.toLowerCase().includes(q) || e.sourceType.toLowerCase().includes(q)
  );
  const filteredManual     = manual.filter(
    (m) => m.reference.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q)
  );
  const filteredPayables   = payables.filter(
    (p) => p.invoiceNo.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)
  );
  const filteredReceivables = receivables.filter(
    (r) => (r.invoiceNo ?? "").toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q) || r.orderNo.toLowerCase().includes(q)
  );

  const today = new Date();

  const getExportData = () => {
    if (tab === "ecritures") return {
      title: "Documents Finance — Écritures comptables",
      count: filteredEntries.length,
      columns: ["Référence", "Type", "Module", "Contrepartie", "Sens", "Montant", "Statut", "Date"],
      rows: filteredEntries.map((e) => [
        e.reference || "—", e.entryType.replace(/_/g, " "), e.sourceModule,
        e.counterpartyName || "—", e.direction,
        `${e.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        e.status, fmt(e.occurredAt),
      ]) as (string | number)[][],
      filename: `ecritures-${new Date().toISOString().slice(0, 10)}`,
    };
    if (tab === "journal") return {
      title: "Documents Finance — Journal manuel",
      count: filteredManual.length,
      columns: ["Référence", "Description", "Lignes", "Total débit", "Date comptable", "Créé le"],
      rows: filteredManual.map((m) => {
        const totalDebit = m.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + l.amount, 0);
        return [
          m.reference, m.description || "—", m.lines.length,
          `${totalDebit.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
          fmt(m.occurredAt), fmt(m.createdAt),
        ];
      }) as (string | number)[][],
      filename: `journal-manuel-${new Date().toISOString().slice(0, 10)}`,
    };
    // tab === "factures"
    if (facturesTab === "fournisseurs") return {
      title: "Documents Finance — Factures fournisseurs",
      count: filteredPayables.length,
      columns: ["N° Facture", "Fournisseur", "Statut", "Total TTC", "Payé", "Restant dû", "Échéance", "Correspondance"],
      rows: filteredPayables.map((p) => [
        p.invoiceNo, p.supplierName, p.status.replace(/_/g, " "),
        `${p.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        `${p.amountPaid.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        `${p.outstanding.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        fmt(p.dueDate), p.matchingStatus,
      ]) as (string | number)[][],
      filename: `factures-fournisseurs-${new Date().toISOString().slice(0, 10)}`,
    };
    return {
      title: "Documents Finance — Factures clients",
      count: filteredReceivables.length,
      columns: ["N° Facture", "N° Commande", "Client", "Statut", "Paiement", "Total TTC", "Date livraison"],
      rows: filteredReceivables.map((r) => [
        r.invoiceNo || "—", r.orderNo, r.customerName,
        r.status.replace(/_/g, " "), (r.paymentStatus ?? "NON_PAYEE").replace(/_/g, " "),
        r.totalTtc != null ? `${r.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND` : `${r.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
        fmt(r.deliveredAt ?? r.shippedAt),
      ]) as (string | number)[][],
      filename: `factures-clients-${new Date().toISOString().slice(0, 10)}`,
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
    { key: "ecritures", label: "Écritures",      icon: BookOpen,   count: entries.length },
    { key: "journal",   label: "Journal manuel", icon: BookMarked, count: manual.length },
    { key: "factures",  label: "Factures",        icon: Receipt,    count: payables.length + receivables.length },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <FileText size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Documents</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Archive des écritures, saisies manuelles et factures</p>
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
        ) : tab === "ecritures" ? (
          <div className={`${surface} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className={thCls}>Référence</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Module</th>
                    <th className={thCls}>Contrepartie</th>
                    <th className={thCls}>Sens</th>
                    <th className={thCls}>Montant</th>
                    <th className={thCls}>Statut</th>
                    <th className={thCls}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEntries.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Aucune écriture trouvée</td></tr>
                  ) : filteredEntries.map((e) => (
                    <tr key={e._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{e.reference || "—"}</td>
                      <td className={tdCls}><EntryBadge status={e.entryType} /></td>
                      <td className={`${tdCls} text-xs text-slate-500`}>{e.sourceModule}</td>
                      <td className={`${tdCls} text-slate-700 dark:text-slate-300`}>{e.counterpartyName || "—"}</td>
                      <td className={`${tdCls} text-xs font-semibold ${DIRECTION_COLORS[e.direction]}`}>{e.direction}</td>
                      <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(e.amount)} TND</td>
                      <td className={tdCls}><StatusBadge status={e.status} /></td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(e.occurredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        ) : tab === "journal" ? (
          <div className={`${surface} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className={thCls}>Référence</th>
                    <th className={thCls}>Description</th>
                    <th className={thCls}>Lignes</th>
                    <th className={thCls}>Total débit</th>
                    <th className={thCls}>Date comptable</th>
                    <th className={thCls}>Créé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredManual.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Aucune saisie manuelle trouvée</td></tr>
                  ) : filteredManual.map((m) => {
                    const totalDebit = m.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + l.amount, 0);
                    return (
                      <tr key={m._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{m.reference}</td>
                        <td className={`${tdCls} max-w-[220px] truncate text-slate-700 dark:text-slate-300`}>{m.description || "—"}</td>
                        <td className={`${tdCls} text-slate-600 dark:text-slate-300`}>
                          {m.lines.length} ligne{m.lines.length !== 1 ? "s" : ""}
                        </td>
                        <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(totalDebit)} TND</td>
                        <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(m.occurredAt)}</td>
                        <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(m.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        ) : (
          /* Factures tab */
          <div className="space-y-4">
            {/* Sub-toggle */}
            <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit dark:border-slate-800 dark:bg-slate-900">
              {(["fournisseurs", "clients"] as FacturesSubTab[]).map((k) => (
                <button
                  key={k}
                  onClick={() => { setFacturesTab(k); setSearch(""); }}
                  className={`rounded-xl px-4 py-1.5 text-sm font-medium transition capitalize ${facturesTab === k ? "bg-white shadow text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                  {k === "fournisseurs" ? "Fournisseurs" : "Clients"}
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${facturesTab === k ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                    {k === "fournisseurs" ? filteredPayables.length : filteredReceivables.length}
                  </span>
                </button>
              ))}
            </div>

            {facturesTab === "fournisseurs" ? (
              <div className={`${surface} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/40">
                      <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        <th className={thCls}>N° Facture</th>
                        <th className={thCls}>Fournisseur</th>
                        <th className={thCls}>Statut</th>
                        <th className={thCls}>Total TTC</th>
                        <th className={thCls}>Payé</th>
                        <th className={thCls}>Restant dû</th>
                        <th className={thCls}>Échéance</th>
                        <th className={thCls}>Correspondance</th>
                        <th className="w-10 px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPayables.length === 0 ? (
                        <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">Aucune facture fournisseur trouvée</td></tr>
                      ) : filteredPayables.map((p) => {
                        const overdue = p.isOverdue && p.status !== "PAID";
                        return (
                          <tr key={p._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{p.invoiceNo}</td>
                            <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{p.supplierName}</td>
                            <td className={tdCls}><StatusBadge status={p.status} /></td>
                            <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>{tnd(p.totalTtc)} TND</td>
                            <td className={`${tdCls} tabular-nums text-emerald-600 dark:text-emerald-400`}>{tnd(p.amountPaid)} TND</td>
                            <td className={`${tdCls} tabular-nums font-semibold ${p.outstanding > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                              {tnd(p.outstanding)} TND
                            </td>
                            <td className={`${tdCls} text-xs whitespace-nowrap ${overdue ? "font-semibold text-rose-500 dark:text-rose-400" : "text-slate-400"}`}>
                              {fmt(p.dueDate)}{overdue ? " ⚠" : ""}
                            </td>
                            <td className={tdCls}>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.matchingStatus === "MATCHED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                                {p.matchingStatus}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                title="Imprimer"
                                onClick={() => void printInvoiceTemplate({
                                  docType: "FACTURE FOURNISSEUR",
                                  companyRole: "ACHETEUR",
                                  invoiceNo: p.invoiceNo,
                                  dueDate: p.dueDate,
                                  invoiceDate: p.invoiceDate,
                                  paymentStatus: p.status,
                                  company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, bank: settings.bank, agence: settings.agence } : undefined,
                                  party: { label: "FOURNISSEUR", name: p.supplierName },
                                  totalTtc: p.totalTtc,
                                  amountPaid: p.amountPaid,
                                }, `${p.invoiceNo}.pdf`)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              >
                                <Printer size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
                        <th className={thCls}>N° Commande</th>
                        <th className={thCls}>Client</th>
                        <th className={thCls}>Statut</th>
                        <th className={thCls}>Paiement</th>
                        <th className={thCls}>Montant</th>
                        <th className={thCls}>Date livraison</th>
                        <th className="w-10 px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredReceivables.length === 0 ? (
                        <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Aucune facture client trouvée</td></tr>
                      ) : filteredReceivables.map((r) => (
                        <tr key={r._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{r.invoiceNo || "—"}</td>
                          <td className={`${tdCls} font-mono text-xs text-slate-500`}>{r.orderNo}</td>
                          <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{r.customerName}</td>
                          <td className={tdCls}><StatusBadge status={r.status} /></td>
                          <td className={tdCls}><StatusBadge status={r.paymentStatus ?? "NON_PAYEE"} /></td>
                          <td className={`${tdCls} tabular-nums text-slate-700 dark:text-slate-300`}>
                            {tnd(r.totalTtc ?? r.amount)} TND
                          </td>
                          <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>
                            {fmt(r.deliveredAt ?? r.shippedAt)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              title="Imprimer"
                              onClick={() => void printInvoiceTemplate({
                                invoiceNo: r.invoiceNo || r.orderNo,
                                orderNo: r.orderNo,
                                paymentStatus: r.paymentStatus,
                                paymentMethod: r.paymentMethod,
                                company: settings ? { name: settings.companyName, address: settings.address, phone: settings.phone, email: settings.email, mf: settings.mf, rne: settings.rne, rib: settings.rib, bank: settings.bank, agence: settings.agence } : undefined,
                                party: { label: "CLIENT / DESTINATAIRE", name: r.customerName },
                                totalTtc: r.totalTtc ?? r.amount,
                                amountPaid: r.amountPaid,
                              }, `${r.invoiceNo || r.orderNo}.pdf`)}
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
        )}
      </div>
    </ProtectedRoute>
  );
}
