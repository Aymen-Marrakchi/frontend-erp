"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { stockInventoryService } from "@/services/stock/stockInventoryService";
import { purchaseReceiptService, type PurchaseReceipt } from "@/services/purchase/purchaseReceiptService";
import { useEffect, useState } from "react";
import { FileText, Loader2, Search, ClipboardList, Truck, Download, Printer } from "lucide-react";
import { exportToPdf, exportToCsv, printInvoicePdf } from "@/lib/pdfExport";

interface InventorySession {
  _id: string;
  code: string;
  type: "PERIODIC" | "PERMANENT";
  status: "IN_PROGRESS" | "SENT_TO_DEPOT" | "PENDING_APPROVAL" | "CLOSED";
  depotId?: { _id: string; name: string } | null;
  startedBy?: { _id: string; name: string } | null;
  createdAt: string;
  closedAt?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS:      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  SENT_TO_DEPOT:    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  CLOSED:           "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  PARTIAL:          "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  FULL:             "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  LITIGATION:       "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
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

const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const thCls = "px-5 py-3 font-medium";
const tdCls = "px-5 py-3";

type Tab = "inventaires" | "receptions";

export default function DepotDocumentsPage() {
  const [tab, setTab]               = useState<Tab>("inventaires");
  const [inventories, setInventories] = useState<InventorySession[]>([]);
  const [receipts, setReceipts]     = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      stockInventoryService.getAll(),
      purchaseReceiptService.getMine(),
    ])
      .then(([inv, rec]) => { setInventories(inv); setReceipts(rec); })
      .catch((e) => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filteredInventories = inventories.filter(
    (i) => i.code.toLowerCase().includes(q) || (i.depotId?.name ?? "").toLowerCase().includes(q)
  );
  const filteredReceipts = receipts.filter(
    (r) => r.receiptNo.toLowerCase().includes(q) || (r.supplierId?.name ?? "").toLowerCase().includes(q)
  );

  const getExportData = () => {
    if (tab === "inventaires") return {
      title: "Documents Dépôt — Inventaires",
      count: filteredInventories.length,
      columns: ["Code", "Type", "Dépôt", "Statut", "Créé par", "Date création", "Clôturé le"],
      rows: filteredInventories.map((i) => [
        i.code, i.type, i.depotId?.name ?? "—",
        i.status.replace(/_/g, " "), i.startedBy?.name ?? "—",
        fmt(i.createdAt), fmt(i.closedAt),
      ]) as (string | number)[][],
      filename: `inventaires-depot-${new Date().toISOString().slice(0, 10)}`,
    };
    return {
      title: "Documents Dépôt — Bons de réception",
      count: filteredReceipts.length,
      columns: ["N° Bon", "Fournisseur", "N° Commande", "Dépôt", "Statut", "Lignes", "Date"],
      rows: filteredReceipts.map((r) => [
        r.receiptNo, r.supplierId?.name ?? "—",
        r.purchaseOrderId?.orderNo ?? "—", r.depotId?.name ?? "—",
        r.receiptStatus, r.lines?.length ?? 0, fmt(r.createdAt),
      ]) as (string | number)[][],
      filename: `receptions-depot-${new Date().toISOString().slice(0, 10)}`,
    };
  };

  const handlePdf = async () => {
    setExporting(true);
    const d = getExportData();
    try { await exportToPdf(d.title, `${d.count} enregistrement(s)`, d.columns, d.rows, `${d.filename}.pdf`); }
    finally { setExporting(false); }
  };

  const handleCsv = () => {
    const d = getExportData();
    exportToCsv(d.columns, d.rows, `${d.filename}.csv`);
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; count: number }[] = [
    { key: "inventaires", label: "Inventaires",       icon: ClipboardList, count: inventories.length },
    { key: "receptions",  label: "Bons de réception", icon: Truck,         count: receipts.length },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "DEPOT_MANAGER", "STOCK_MANAGER"]}>
      <div className="space-y-6">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <FileText size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Documents</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Archive des documents du module dépôt</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setSearch(""); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-medium transition ${tab === key ? "bg-white shadow text-slate-950 dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <Icon size={13} />{label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === key ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
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
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
            </button>
            <button
              onClick={handleCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Chargement...
          </div>
        ) : tab === "inventaires" ? (
          <div className={`${surface} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className={thCls}>Code</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Dépôt</th>
                    <th className={thCls}>Statut</th>
                    <th className={thCls}>Créé par</th>
                    <th className={thCls}>Date création</th>
                    <th className={thCls}>Clôturé le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInventories.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Aucun inventaire trouvé</td></tr>
                  ) : filteredInventories.map((inv) => (
                    <tr key={inv._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{inv.code}</td>
                      <td className={`${tdCls} text-xs text-slate-500`}>{inv.type}</td>
                      <td className={`${tdCls} text-slate-700 dark:text-slate-300`}>{inv.depotId?.name ?? "—"}</td>
                      <td className={tdCls}><Badge status={inv.status} /></td>
                      <td className={`${tdCls} text-xs text-slate-500`}>{inv.startedBy?.name ?? "—"}</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(inv.createdAt)}</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(inv.closedAt)}</td>
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
                    <th className={thCls}>N° Bon</th>
                    <th className={thCls}>Fournisseur</th>
                    <th className={thCls}>N° Commande</th>
                    <th className={thCls}>Dépôt</th>
                    <th className={thCls}>Statut</th>
                    <th className={thCls}>Lignes</th>
                    <th className={thCls}>Date</th>
                    <th className="w-10 px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReceipts.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">Aucun bon de réception trouvé</td></tr>
                  ) : filteredReceipts.map((r) => (
                    <tr key={r._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className={`${tdCls} font-mono text-xs font-semibold text-slate-800 dark:text-slate-200`}>{r.receiptNo}</td>
                      <td className={`${tdCls} font-medium text-slate-900 dark:text-white`}>{r.supplierId?.name ?? "—"}</td>
                      <td className={`${tdCls} font-mono text-xs text-slate-500`}>{r.purchaseOrderId?.orderNo ?? "—"}</td>
                      <td className={`${tdCls} text-xs text-slate-500`}>{r.depotId?.name ?? "—"}</td>
                      <td className={tdCls}><Badge status={r.receiptStatus} /></td>
                      <td className={`${tdCls} text-slate-600 dark:text-slate-300`}>{r.lines?.length ?? 0} ligne{(r.lines?.length ?? 0) !== 1 ? "s" : ""}</td>
                      <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>{fmt(r.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          title="Imprimer"
                          onClick={() => void printInvoicePdf(
                            "Bon de réception", r.receiptNo,
                            "Fournisseur", r.supplierId?.name ?? "—",
                            [
                              { label: "N° Commande", value: r.purchaseOrderId?.orderNo ?? "—" },
                              { label: "Dépôt",       value: r.depotId?.name ?? "—" },
                              { label: "Statut",      value: r.receiptStatus.replace(/_/g, " ") },
                              { label: "Date",        value: fmt(r.createdAt) },
                            ],
                            [
                              { label: "Nombre de lignes reçues", value: `${r.lines?.length ?? 0} ligne(s)`, bold: true },
                            ],
                            `${r.receiptNo}.pdf`
                          )}
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
