"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { financeService, TvaDeclarationResponse } from "@/services/finance/financeService";
import { useState } from "react";
import { FileText, Loader2, Printer } from "lucide-react";

function tnd(v: number | undefined | null) {
  return `${(v ?? 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`;
}

const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const inputClass = "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function Row({ label, value, bold, negative }: { label: string; value: number | undefined | null; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${bold ? "border-t border-slate-200 font-semibold text-slate-900 dark:border-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
      <span>{label}</span>
      <span className={negative ? "text-rose-600 dark:text-rose-400" : ""}>{tnd(value)}</span>
    </div>
  );
}

function printDeclaration(data: TvaDeclarationResponse, monthName: string) {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"/><title>Déclaration TVA · ${monthName} ${data.period.year}</title></head>
  <body style="font-family:Arial,sans-serif;color:#0f172a;padding:32px;max-width:600px;margin:auto">
    <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:24px;display:flex;justify-content:space-between">
      <div>
        <div style="font-size:16px;font-weight:700">Déclaration TVA mensuelle</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">Période : ${monthName} ${data.period.year}</div>
      </div>
      <div style="font-size:11px;color:#64748b;text-align:right">Généré le ${new Date().toLocaleDateString("fr-TN")}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="text-align:left;padding:8px 12px;border:1px solid #e2e8f0">Désignation</th>
          <th style="text-align:right;padding:8px 12px;border:1px solid #e2e8f0">Montant (TND)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#64748b">Base HT ventes</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${data.salesRevenue.toFixed(3)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#64748b">Base HT achats</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${data.purchasesHt.toFixed(3)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">4457 — TVA collectée (ventes)</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${data.tvaCollectee.toFixed(3)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">4456 — TVA déductible (achats)</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">(${data.tvaDeductible.toFixed(3)})</td></tr>
        <tr style="font-weight:700;background:#f8fafc"><td style="padding:8px 12px;border:1px solid #e2e8f0">TVA nette à verser</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;color:${data.tvaNet >= 0 ? '#0f172a' : '#16a34a'}">${data.tvaNet.toFixed(3)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">44581 — FODEC collecté</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${data.fodecCollecte.toFixed(3)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">4371 — Timbre fiscal à décaisser</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${data.timbreADecaisser.toFixed(3)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #e2e8f0">4028 — Retenues à la source à décaisser</td><td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right">${data.rsADecaisser.toFixed(3)}</td></tr>
      </tbody>
    </table>

    <div style="margin-top:32px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px">
      Document généré automatiquement depuis le système ERP. Vérifier avant dépôt DGI.
    </div>
  </body>
</html>`;
  const win = window.open("", "_blank", "width=700,height=600");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }
}

export default function TvaDeclarationPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<TvaDeclarationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await financeService.getTvaDeclaration(year, month));
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null &&
        "response" in err && typeof (err as Record<string, unknown>).response === "object"
          ? ((err as { response: { data?: { message?: string } } }).response?.data?.message || "Erreur de chargement")
          : "Erreur de chargement";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <FileText size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Déclaration TVA
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              État mensuel TVA / FODEC / Timbre / RS — à déposer à la DGI
            </p>
          </div>
        </div>

        <div className={`${surface} p-5`}>
          <div className="flex flex-wrap items-end gap-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Année</span>
              <select className={inputClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Mois</span>
              <select className={inputClass} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-black bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Calculer
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {data ? (
          <div className={`${surface} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Déclaration — {MONTHS[data.period.month - 1]} {data.period.year}
              </h2>
              <button
                onClick={() => printDeclaration(data, MONTHS[data.period.month - 1])}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Printer size={14} />
                Imprimer
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <div className="pb-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Base imposable</p>
                <Row label="Chiffre d'affaires HT (ventes)" value={data.salesRevenue} />
                <Row label="Achats HT" value={data.purchasesHt} />
              </div>

              <div className="py-3">
                <p className="mb-2 mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">TVA (compte 4457 / 4456)</p>
                <Row label="TVA collectée sur ventes" value={data.tvaCollectee} />
                <Row label="TVA déductible sur achats" value={data.tvaDeductible} />
                <Row label="TVA nette due à la DGI" value={data.tvaNet} bold negative={data.tvaNet < 0} />
              </div>

              <div className="py-3">
                <p className="mb-2 mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Taxes parafiscales</p>
                <Row label="FODEC collecté (44581)" value={data.fodecCollecte} />
                <Row label="Timbre fiscal (4371)" value={data.timbreADecaisser} />
              </div>

              <div className="pt-3">
                <p className="mb-2 mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Retenue à la source</p>
                <Row label="RS à décaisser (4028)" value={data.rsADecaisser} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white dark:bg-slate-950">
              <div className="flex justify-between">
                <span>Total à verser à la DGI</span>
                <span>{tnd((data.tvaNet > 0 ? data.tvaNet : 0) + data.fodecCollecte + data.timbreADecaisser + data.rsADecaisser)}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Ce document est généré automatiquement depuis les écritures ERP. Vérifiez les montants avant tout dépôt auprès de la DGI.
            </p>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
