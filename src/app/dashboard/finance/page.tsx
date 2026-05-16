"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { financeService, FinanceDashboardResponse, SalesReportMonth } from "@/services/finance/financeService";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

function tnd(v: number) {
  return (v ?? 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// Simple static sparkline paths
const SPARKLINES = [
  "M0,32 C30,28 55,18 90,16 S150,10 200,6",
  "M0,28 C25,24 50,16 85,14 S155,8 200,5",
  "M0,30 C40,26 70,20 110,18 S165,14 200,12",
  "M0,24 C35,28 65,30 100,26 S160,16 200,12",
];

function Sparkline({ path, color }: { path: string; color: string }) {
  return (
    <svg viewBox="0 0 200 40" className="h-10 w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const MONTH_SHORT: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
  "05": "Mai", "06": "Jui", "07": "Jul", "08": "Aoû",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

function RevenueChart({ data, noDataLabel }: { data: SalesReportMonth[]; noDataLabel: string }) {
  const W = 600, H = 180, padL = 64, padR = 20, padT = 16, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = data.map((d) => d.totalTtc);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;

  const xScale = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v: number) => padT + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

  const points = data.map((d, i) => ({ x: xScale(i), y: yScale(d.totalTtc) }));

  const linePath = points.length < 2 ? "" : points.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, "");

  const areaPath = linePath
    ? `${linePath} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`
    : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: maxVal * f,
    y: yScale(maxVal * f),
  }));

  const fmtK = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k`
    : String(Math.round(v));

  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        {noDataLabel}
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      <defs>
        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid lines */}
      {yTicks.map((t) => (
        <g key={t.v}>
          <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
          <text x={padL - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">
            {fmtK(t.v)}
          </text>
        </g>
      ))}

      {/* area fill */}
      {areaPath && <path d={areaPath} fill="url(#rev-grad)" />}

      {/* line */}
      {linePath && (
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* dots + month labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">
            {MONTH_SHORT[data[i].month.slice(5, 7)] ?? data[i].month.slice(5, 7)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function FinanceDashboardPage() {
  const { t } = useLanguage();
  const [dashboard, setDashboard] = useState<FinanceDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salesData, setSalesData] = useState<SalesReportMonth[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  const ENTRY_LABELS: Record<string, string> = {
    INVOICE_ISSUED: t("fin_entryInvoiceIssued"),
    REGLEMENT_RECU: t("fin_entryPaymentReceived"),
    PAYABLE_RECORDED: t("fin_entrySupplierInvoice"),
    PAYABLE_PAYMENT: t("fin_entrySupplierPayment"),
    PAYABLE_CREDIT: t("fin_entryCreditNote"),
    MANUAL_ENTRY: t("fin_entryManual"),
  };

  useEffect(() => {
    financeService.getDashboard()
      .then(setDashboard)
      .catch((err) => setError(err?.response?.data?.message || "Échec du chargement"))
      .finally(() => setLoading(false));

    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    financeService.getSalesReport(fmt(from), fmt(to))
      .then((r) => setSalesData(r.byMonth))
      .catch(() => {})
      .finally(() => setSalesLoading(false));
  }, []);

  const totals = dashboard?.totals;
  const creances   = totals?.totalReceivables        ?? 0;
  const dettes     = totals?.totalPayablesOutstanding ?? 0;
  const net        = creances - dettes;
  const total      = creances + dettes;
  const creancesPct = total > 0 ? Math.round((creances / total) * 100) : 50;

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Finance · ERP
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t("fin_dashTitle")}
          </h1>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-24 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 size={16} className="animate-spin" /> {t("fin_loading")}
          </div>
        ) : (
          <>
            {/* ── Overdue alert ── */}
            {(totals?.overduePayables ?? 0) > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <AlertTriangle size={15} className="shrink-0 text-amber-500" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">
                    {totals?.overduePayables}{" "}
                    {(totals?.overduePayables ?? 0) > 1 ? t("fin_overdueAlertPlural") : t("fin_overdueAlert")}.
                  </span>{" "}
                  {t("fin_resolveOverdue")}
                </p>
                <Link href="/dashboard/finance/payables" className="ml-auto shrink-0 rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40">
                  {t("fin_seeMore")}
                </Link>
              </div>
            )}

            {/* ── Row 1 · Hero sparkline cards ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {/* Créances */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
                      <ArrowUpRight size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {t("fin_toCollect")}
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t("fin_clientReceivables")}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {tnd(creances)}
                    <span className="ml-1 text-sm font-medium text-slate-400">{t("fin_tnd")}</span>
                  </p>
                </div>
                <div className="px-0 pb-0">
                  <Sparkline path={SPARKLINES[0]} color="#10b981" />
                </div>
              </div>

              {/* Encaissé clients */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                      <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      +{tnd(totals?.totalCollected ?? 0)}
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t("fin_clientCollected")}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    +{tnd(totals?.totalCollected ?? 0)}
                    <span className="ml-1 text-sm font-medium text-slate-400">{t("fin_tnd")}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{t("fin_cashReceived")}</p>
                </div>
                <div className="px-0 pb-0">
                  <Sparkline path={SPARKLINES[1]} color="#10b981" />
                </div>
              </div>

              {/* Trésorerie nette */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40">
                      <Wallet size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${net >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"}`}>
                      {net >= 0 ? "+" : "−"}{tnd(Math.abs(net))}
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t("fin_netCash")}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {tnd(totals?.netExpectedCash ?? 0)}
                    <span className="ml-1 text-sm font-medium text-slate-400">{t("fin_tnd")}</span>
                  </p>
                </div>
                <div className="px-0 pb-0">
                  <Sparkline path={SPARKLINES[2]} color="#f59e0b" />
                </div>
              </div>

              {/* Dettes */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="px-5 pt-5 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40">
                      <ArrowDownLeft size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      {t("fin_toPay")}
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{t("fin_supplierPayables")}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {tnd(dettes)}
                    <span className="ml-1 text-sm font-medium text-slate-400">{t("fin_tnd")}</span>
                  </p>
                </div>
                <div className="px-0 pb-0">
                  <Sparkline path={SPARKLINES[3]} color="#8b5cf6" />
                </div>
              </div>
            </div>

            {/* ── Courbe chiffre d'affaires ── */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950 dark:text-white">{t("fin_revenue")}</h2>
                  <p className="text-xs text-slate-400">{t("fin_last12Months")}</p>
                </div>
                {salesLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
              </div>
              <RevenueChart data={salesData} noDataLabel={t("fin_noSalesData")} />
            </div>

            {/* ── Row 2 · Secondary metric cards ── */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  label: t("fin_disbursements"),
                  value: tnd(totals?.totalPaidOut ?? 0),
                  unit: t("fin_tnd"),
                  sub: t("fin_totalPaidSupplier"),
                },
                {
                  label: t("fin_netPosition"),
                  value: (net >= 0 ? "+" : "−") + tnd(Math.abs(net)),
                  unit: t("fin_tnd"),
                  sub: net >= 0 ? t("fin_positiveBalance") : t("fin_negativeBalance"),
                  valueColor: net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                },
                {
                  label: t("fin_overdueInvoices"),
                  value: String(totals?.overduePayables ?? 0),
                  unit: "",
                  sub: (totals?.overduePayables ?? 0) > 0 ? t("fin_requiresAction") : t("fin_noOverdue"),
                  valueColor: (totals?.overduePayables ?? 0) > 0 ? "text-rose-600 dark:text-rose-400" : undefined,
                },
                {
                  label: t("fin_recognizedRevenue"),
                  value: tnd(totals?.recognizedRevenue ?? 0),
                  unit: t("fin_tnd"),
                  sub: t("fin_invoicedRevenue"),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className={`mt-2 text-2xl font-bold tracking-tight ${item.valueColor ?? "text-slate-950 dark:text-white"}`}>
                    {item.value}
                    {item.unit && <span className="ml-1 text-sm font-medium text-slate-400">{item.unit}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Cash health bar ── */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("fin_receivablesPayablesTitle")}</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${net >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"}`}>
                  {net >= 0 ? <TrendingUp size={11} className="mr-1 inline" /> : <TrendingDown size={11} className="mr-1 inline" />}
                  {net >= 0 ? t("fin_positive") : t("fin_negative")}
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-l-full bg-emerald-500 transition-all dark:bg-emerald-600" style={{ width: `${creancesPct}%` }} />
                <div className="h-full rounded-r-full bg-rose-500 transition-all dark:bg-rose-600" style={{ width: `${100 - creancesPct}%` }} />
              </div>
              <div className="mt-2.5 flex justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  {t("fin_receivablesLabel")} {creancesPct}% — {tnd(creances)} {t("fin_tnd")}
                </span>
                <span className="flex items-center gap-1.5">
                  {t("fin_payablesLabel")} {100 - creancesPct}% — {tnd(dettes)} {t("fin_tnd")}
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                </span>
              </div>
            </div>

            {/* ── Recent activity ── */}
            {(dashboard?.recentEntries?.length ?? 0) > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">{t("fin_recentActivity")}</h2>
                    <p className="text-xs text-slate-400">{t("fin_latestEvents")}</p>
                  </div>
                  <Link href="/dashboard/finance/journal" className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                    {t("fin_seeJournal")}
                  </Link>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {dashboard!.recentEntries.slice(0, 7).map((entry) => {
                    const isIn  = entry.direction === "INFLOW";
                    const isOut = entry.direction === "OUTFLOW";
                    return (
                      <div key={entry._id} className="flex items-center gap-4 px-6 py-3.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${isIn ? "bg-emerald-50 dark:bg-emerald-950/40" : isOut ? "bg-rose-50 dark:bg-rose-950/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                          {isIn  ? <ArrowUpRight   size={15} className="text-emerald-600 dark:text-emerald-400" />
                          : isOut ? <ArrowDownLeft  size={15} className="text-rose-600 dark:text-rose-400" />
                                  : <FileText       size={15} className="text-slate-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {entry.counterpartyName || entry.reference}
                          </p>
                          <p className="text-xs text-slate-400">{ENTRY_LABELS[entry.entryType] ?? entry.entryType}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isIn ? "text-emerald-600 dark:text-emerald-400" : isOut ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                            {isIn ? "+" : isOut ? "−" : ""}{tnd(entry.amount)} {t("fin_tnd")}
                          </p>
                          <p className="text-xs text-slate-400">{timeAgo(entry.occurredAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
