"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { financeService, type CompanySettings } from "@/services/finance/financeService";
import { FileText, Loader2, Printer, Search, X, BadgeCheck, Clock, AlertCircle, CircleDashed } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function getErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof err.response === "object" &&
    err.response !== null &&
    "data" in err.response &&
    typeof err.response.data === "object" &&
    err.response.data !== null &&
    "message" in err.response.data &&
    typeof err.response.data.message === "string"
  ) {
    return err.response.data.message;
  }
  return fallback;
}

function roundAmount(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}

function buildInvoicePreview(
  quotation: CustomerInvoice | null,
  pricingMode: "HT_BASED" | "TTC_BASED"
) {
  if (!quotation) {
    return {
      subtotalHt: 0,
      totalVat: 0,
      totalFodec: 0,
      totalBeforeStamp: 0,
      timbreFiscal: 1,
      totalTtc: 1,
    };
  }

  const applyTva = quotation.applyTva ?? true;
  const applyFodec = quotation.applyFodec ?? true;
  const tvaRate = applyTva ? Number(quotation.tvaRate || 19) : 0;
  const fodecRate = applyFodec ? Number(quotation.fodecRate || 1) : 0;
  const timbreFiscal = roundAmount(Number(quotation.timbreFiscal || 1));
  const multiplier = 1 + tvaRate / 100 + fodecRate / 100;

  const totals = quotation.lines.reduce(
    (acc, line) => {
      const quantity = Number(line.quantity || 0);
      const inputUnitPrice = roundAmount(Number(line.inputUnitPrice || 0));
      const baseUnitHt =
        pricingMode === "TTC_BASED"
          ? roundAmount(multiplier > 0 ? inputUnitPrice / multiplier : inputUnitPrice)
          : inputUnitPrice;
      const subtotalHt = roundAmount(baseUnitHt * quantity);
      const totalVat = roundAmount(subtotalHt * (tvaRate / 100));
      const totalFodec = roundAmount(subtotalHt * (fodecRate / 100));
      const totalBeforeStamp =
        pricingMode === "TTC_BASED"
          ? roundAmount(inputUnitPrice * quantity)
          : roundAmount(subtotalHt + totalVat + totalFodec);

      return {
        subtotalHt: roundAmount(acc.subtotalHt + subtotalHt),
        totalVat: roundAmount(acc.totalVat + totalVat),
        totalFodec: roundAmount(acc.totalFodec + totalFodec),
        totalBeforeStamp: roundAmount(acc.totalBeforeStamp + totalBeforeStamp),
      };
    },
    { subtotalHt: 0, totalVat: 0, totalFodec: 0, totalBeforeStamp: 0 }
  );

  return {
    ...totals,
    timbreFiscal,
    totalTtc: roundAmount(totals.totalBeforeStamp + timbreFiscal),
  };
}

// ─── Montant en lettres (French, TND) ────────────────────────────────────────
function numToWordsFR(n: number): string {
  if (n === 0) return "zéro";
  const ones = ["","un","deux","trois","quatre","cinq","six","sept","huit","neuf",
    "dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
  const tens = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];
  let r = "";
  if (n >= 1000000) { r += numToWordsFR(Math.floor(n / 1000000)) + " million "; n %= 1000000; }
  if (n >= 1000) {
    if (Math.floor(n / 1000) === 1) r += "mille ";
    else r += numToWordsFR(Math.floor(n / 1000)) + " mille ";
    n %= 1000;
  }
  if (n >= 100) {
    if (Math.floor(n / 100) === 1) r += "cent ";
    else r += ones[Math.floor(n / 100)] + " cent ";
    n %= 100;
  }
  if (n >= 20) {
    const t = Math.floor(n / 10), o = n % 10;
    if (t === 7 || t === 9) { r += tens[t] + "-" + ones[10 + o] + " "; }
    else if (t === 8) { r += (o === 0 ? "quatre-vingts" : "quatre-vingt-" + ones[o]) + " "; }
    else { r += tens[t] + (o === 1 ? "-et-un" : o > 0 ? "-" + ones[o] : "") + " "; }
  } else if (n > 0) { r += ones[n] + " "; }
  return r.trim();
}

function montantEnLettres(montant: number): string {
  const totalMillimes = Math.round(montant * 1000);
  const dinars = Math.floor(totalMillimes / 1000);
  const millimes = totalMillimes % 1000;
  let r = numToWordsFR(dinars) + (dinars > 1 ? " dinars" : " dinar");
  if (millimes > 0) r += " et " + numToWordsFR(millimes) + (millimes > 1 ? " millimes" : " millime");
  return r.charAt(0).toUpperCase() + r.slice(1);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESPECE: "Espèces", CHEQUE: "Chèque", VIREMENT: "Virement bancaire",
  KUMBIL: "Kumbil", MIXED: "Mode mixte", UNSET: "—",
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NON_PAYEE: "Non payée", PARTIELLEMENT_PAYEE: "Partiellement payée",
  PENDING_CHEQUE: "Chèque en attente", PAYEE: "Payée",
};
const TEJ_STATUS_LABELS: Record<string, string> = {
  NOT_SUBMITTED: "Non soumis", PENDING: "En attente DGI",
  VALIDATED: "Validé DGI", REJECTED: "Rejeté DGI",
};

function openInvoiceDocument(invoice: CustomerInvoice, settings: CompanySettings | null) {
  const order = invoice.salesOrderId;
  const tvaRate = invoice.applyTva ? (invoice.tvaRate ?? 19) : 0;
  const fodecRate = invoice.applyFodec ? (invoice.fodecRate ?? 1) : 0;
  const issueDate = new Date(invoice.issueDate || Date.now()).toLocaleDateString("fr-TN");
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-TN") : "—";

  const s = settings;
  const companyName = s?.companyName || "EMM TN";
  const companyAddress = s?.address || "Route de Gabès Km 6, Sfax, Tunisie";
  const companyPhone = s?.phone || "+(216) 98 241 790";
  const companyEmail = s?.email || "info@emmtn.com";
  const companyMf = s?.mf || "";
  const companyRne = s?.rne || "";
  const companyRib = s?.rib || "";
  const companyIban = s?.iban || "";
  const companyBank = s?.bank || "";
  const companyAgence = s?.agence || "";

  const rows = invoice.lines.map((line, idx) => `
    <tr style="background:${idx % 2 === 0 ? "#fff" : "#f8fafc"}">
      <td style="border:1px solid #e2e8f0;padding:7px 10px;text-align:center;color:#64748b;font-size:12px">${idx + 1}</td>
      <td style="border:1px solid #e2e8f0;padding:7px 10px;font-size:11px;color:#64748b">${line.productId?.sku || "—"}</td>
      <td style="border:1px solid #e2e8f0;padding:7px 10px;font-size:13px">${line.productId?.name || "—"}</td>
      <td style="border:1px solid #e2e8f0;padding:7px 10px;text-align:center;font-size:13px">${line.quantity}</td>
      <td style="border:1px solid #e2e8f0;padding:7px 10px;text-align:right;font-size:13px">${line.baseUnitHt.toFixed(3)}</td>
      <td style="border:1px solid #e2e8f0;padding:7px 10px;text-align:right;font-size:13px;font-weight:600">${line.subtotalHt.toFixed(3)}</td>
    </tr>`).join("");

  const isSupplier = invoice.invoiceType === "SUPPLIER";
  const tejStatusLabel = TEJ_STATUS_LABELS[invoice.tejStatus || "NOT_SUBMITTED"] || invoice.tejStatus || "Non soumis";
  const tejColor = invoice.tejStatus === "VALIDATED" ? "#16a34a" : invoice.tejStatus === "REJECTED" ? "#dc2626" : "#94a3b8";
  const isTejValidated = invoice.tejStatus === "VALIDATED";

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Facture ${invoice.invoiceNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #0f172a; background: #fff; }
    @page { size: A4; margin: 18mm 15mm; }
    @media print { body { padding: 0; } }
    .page { max-width: 794px; margin: 0 auto; padding: 24px 28px; }
    table { border-collapse: collapse; width: 100%; }
    th { font-weight: 600; }
  </style>
</head>
<body>
<div class="page">

  <!-- ═══ HEADER ═══ -->
  <table style="margin-bottom:18px">
    <tr>
      <td style="vertical-align:top;width:55%">
        <!-- Company block -->
        <img src="${window.location.origin}/EMMlogo.png" alt="${companyName}" style="height:60px;max-width:180px;object-fit:contain;display:block;margin-bottom:8px"/>
        <div style="font-size:11px;color:#64748b;margin-top:3px">${companyAddress}</div>
        <div style="font-size:11px;color:#64748b;margin-top:1px">Tél : ${companyPhone} &nbsp;·&nbsp; ${companyEmail}</div>
        ${companyMf || companyRne ? `<div style="font-size:11px;color:#64748b;margin-top:4px">${companyMf ? `<strong>MF :</strong> ${companyMf}` : ""}${companyMf && companyRne ? " &nbsp;|&nbsp; " : ""}${companyRne ? `<strong>RNE :</strong> ${companyRne}` : ""}</div>` : ""}
        ${companyRib ? `<div style="font-size:11px;color:#64748b;margin-top:1px"><strong>RIB :</strong> ${companyRib}${companyBank ? ` &nbsp;(${companyBank}${companyAgence ? " — " + companyAgence : ""})` : ""}</div>` : ""}
      </td>
      <td style="vertical-align:top;text-align:right;width:45%">
        <!-- Invoice identity -->
        <div style="font-size:26px;font-weight:700;letter-spacing:-1px;color:#0f172a">FACTURE</div>
        <div style="font-size:15px;font-weight:600;color:#334155;margin-top:2px">${invoice.invoiceNo}</div>
        <table style="margin-top:10px;margin-left:auto;width:auto">
          <tr>
            <td style="font-size:11px;color:#64748b;padding:2px 8px 2px 0;text-align:right">Date :</td>
            <td style="font-size:11px;font-weight:600;padding:2px 0">${issueDate}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#64748b;padding:2px 8px 2px 0;text-align:right">Échéance :</td>
            <td style="font-size:11px;font-weight:600;padding:2px 0">${dueDate}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#64748b;padding:2px 8px 2px 0;text-align:right">Règlement :</td>
            <td style="font-size:11px;font-weight:600;padding:2px 0">${PAYMENT_METHOD_LABELS[invoice.paymentMethod] || "—"}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#64748b;padding:2px 8px 2px 0;text-align:right">Statut :</td>
            <td style="font-size:11px;font-weight:600;padding:2px 0;color:${invoice.paymentStatus === "PAYEE" ? "#16a34a" : "#0f172a"}">${PAYMENT_STATUS_LABELS[invoice.paymentStatus] || invoice.paymentStatus}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#64748b;padding:2px 8px 2px 0;text-align:right">Commande :</td>
            <td style="font-size:11px;font-weight:600;padding:2px 0">${order?.orderNo || "—"}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  ${isSupplier ? `<!-- ═══ TEJ BAND ═══ -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;font-weight:600">Plateforme TEJ — DGI e-Facturation</div>
      <div style="font-size:13px;font-weight:700;margin-top:3px;color:#0f172a">${invoice.tejReference || "NON SOUMIS"}</div>
      <div style="font-size:10px;margin-top:2px;color:${tejColor};font-weight:600">${tejStatusLabel}</div>
    </div>
    <div style="font-size:9px;color:#94a3b8;text-align:right">
      ${isTejValidated ? `<span style="color:#16a34a;font-size:10px;font-weight:700">✓ Validé DGI</span><br/>` : ""}
      Document fiscal électronique<br/>conforme à la loi n°2024-x
    </div>
  </div>` : ""}

  <!-- ═══ VENDOR / CLIENT ═══ -->
  <table style="margin-bottom:16px">
    <tr>
      <td style="width:48%;vertical-align:top;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;font-weight:600;margin-bottom:6px">Vendeur</div>
        <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px">
          <img src="${window.location.origin}/EMMlogo.png" alt="${companyName}" style="height:22px;object-fit:contain"/>
          ${companyName}
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:3px">${companyAddress}</div>
        ${companyMf ? `<div style="font-size:11px;color:#64748b;margin-top:1px">MF : ${companyMf}</div>` : ""}
      </td>
      <td style="width:4%"></td>
      <td style="width:48%;vertical-align:top;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;font-weight:600;margin-bottom:6px">Client / Destinataire</div>
        <div style="font-size:13px;font-weight:700">${invoice.customerName}</div>
        ${invoice.customerMf ? `<div style="font-size:11px;color:#64748b;margin-top:3px">MF : ${invoice.customerMf}</div>` : ""}
        ${invoice.customerAddress ? `<div style="font-size:11px;color:#64748b;margin-top:1px">Adresse : ${invoice.customerAddress}</div>` : ""}
      </td>
    </tr>
  </table>

  <!-- ═══ PRODUCT TABLE ═══ -->
  <table style="margin-bottom:0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a;color:#fff">
        <th style="padding:9px 10px;text-align:center;font-size:11px;width:32px">N°</th>
        <th style="padding:9px 10px;text-align:left;font-size:11px;width:70px">Réf.</th>
        <th style="padding:9px 10px;text-align:left;font-size:11px">Désignation</th>
        <th style="padding:9px 10px;text-align:center;font-size:11px;width:50px">Qté</th>
        <th style="padding:9px 10px;text-align:right;font-size:11px;width:110px">P.U. HT (TND)</th>
        <th style="padding:9px 10px;text-align:right;font-size:11px;width:110px">Montant HT (TND)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- ═══ TAX SUMMARY ═══ -->
  <div style="display:flex;justify-content:flex-end;margin-top:0;margin-bottom:16px">
    <table style="width:280px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px;overflow:hidden">
      <tr style="background:#f8fafc">
        <td style="padding:6px 12px;font-size:12px;color:#64748b">Total brut HT</td>
        <td style="padding:6px 12px;text-align:right;font-size:12px;font-weight:600">${invoice.subtotalHt.toFixed(3)} TND</td>
      </tr>
      ${fodecRate > 0 ? `<tr>
        <td style="padding:6px 12px;font-size:12px;color:#64748b">FODEC (${fodecRate}%)</td>
        <td style="padding:6px 12px;text-align:right;font-size:12px">${invoice.totalFodec.toFixed(3)} TND</td>
      </tr>` : ""}
      ${tvaRate > 0 ? `<tr>
        <td style="padding:6px 12px;font-size:12px;color:#64748b">TVA (${tvaRate}%)</td>
        <td style="padding:6px 12px;text-align:right;font-size:12px">${invoice.totalVat.toFixed(3)} TND</td>
      </tr>` : ""}
      <tr style="background:#f8fafc">
        <td style="padding:6px 12px;font-size:12px;color:#64748b">Avant timbre</td>
        <td style="padding:6px 12px;text-align:right;font-size:12px">${invoice.totalBeforeStamp.toFixed(3)} TND</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-size:12px;color:#64748b">Timbre fiscal</td>
        <td style="padding:6px 12px;text-align:right;font-size:12px">${invoice.timbreFiscal.toFixed(3)} TND</td>
      </tr>
      <tr style="background:#0f172a">
        <td style="padding:9px 12px;font-size:13px;font-weight:700;color:#fff">NET À PAYER TTC</td>
        <td style="padding:9px 12px;text-align:right;font-size:13px;font-weight:700;color:#fff">${invoice.totalTtc.toFixed(3)} TND</td>
      </tr>
    </table>
  </div>

  <!-- ═══ MONTANT EN LETTRES ═══ -->
  <div style="border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:16px;background:#f8fafc">
    <span style="font-size:11px;color:#64748b">Arrêté la présente facture à la somme de : </span>
    <strong style="font-size:12px">${montantEnLettres(invoice.totalTtc)}</strong>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div style="border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;align-items:flex-start">
    <div style="font-size:10px;color:#64748b;max-width:55%">
      <strong style="color:#0f172a">Conditions de règlement :</strong> ${PAYMENT_METHOD_LABELS[invoice.paymentMethod] || "—"}<br/>
      Tout retard de paiement entraîne des pénalités au taux légal en vigueur.<br/>
      En cas de litige, compétence exclusive du Tribunal de Commerce de Tunis.
    </div>
    <div style="font-size:10px;color:#64748b;text-align:right">
      <strong style="color:#0f172a">Coordonnées bancaires</strong><br/>
      ${companyRib ? `RIB : ${companyRib}<br/>` : ""}
      ${companyIban ? `IBAN : ${companyIban}<br/>` : ""}
      ${companyBank ? `Banque : ${companyBank}${companyAgence ? " · Agence : " + companyAgence : ""}` : ""}
    </div>
  </div>

  <div style="margin-top:14px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:10px">
    ${companyName}${companyMf ? " · MF : " + companyMf : ""}${companyRne ? " · RNE : " + companyRne : ""} · ${companyAddress} · ${companyPhone} · ${companyEmail}
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=750");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
}

export default function FinanceReceivablesPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [quotations, setQuotations] = useState<CustomerInvoice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [createSelectedId, setCreateSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const settingsRef = useRef<CompanySettings | null>(null);

  const [typeFilter, setTypeFilter] = useState<"CLIENT" | "SUPPLIER">("CLIENT");
  const [invoiceType, setInvoiceType] = useState<"CLIENT" | "SUPPLIER">("CLIENT");
  const [pricingMode, setPricingMode] = useState<"HT_BASED" | "TTC_BASED">("HT_BASED");
  const [dueDate, setDueDate] = useState("");

  const [tejOpen, setTejOpen] = useState(false);
  const [tejInvoice, setTejInvoice] = useState<CustomerInvoice | null>(null);
  const [tejRef, setTejRef] = useState("");
  const [tejStatus, setTejStatus] = useState<"NOT_SUBMITTED" | "PENDING" | "VALIDATED" | "REJECTED">("NOT_SUBMITTED");
  const [tejSaving, setTejSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      if (!settingsRef.current) {
        financeService.getSettings().then((s) => { settingsRef.current = s; }).catch(() => {});
      }
      const data = await customerInvoiceService.getAll();
      const invoiceData = data.filter((doc) => doc.documentStage === "INVOICE");
      const quotationData = data.filter(
        (doc) =>
          doc.documentStage === "QUOTATION" &&
          doc.quotationStatus === "ACCEPTED"
      );
      setInvoices(invoiceData);
      setQuotations(quotationData);
      setSelectedId((current) =>
        invoiceData.some((doc) => doc._id === current) ? current : invoiceData[0]?._id || ""
      );
      setCreateSelectedId((current) =>
        quotationData.some((doc) => doc._id === current) ? current : quotationData[0]?._id || ""
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load receivables"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredInvoices = useMemo(() => {
    const query = search.toLowerCase();
    return invoices.filter((doc) =>
      [doc.invoiceNo, doc.customerName, doc.salesOrderId?.orderNo || "", doc.salesOrderId?.status || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [invoices, search]);

  const selectedInvoice = useMemo(
    () => filteredInvoices.find((doc) => doc._id === selectedId) || filteredInvoices[0] || null,
    [filteredInvoices, selectedId]
  );

  const createSelectedQuotation = useMemo(
    () => quotations.find((doc) => doc._id === createSelectedId) || quotations[0] || null,
    [quotations, createSelectedId]
  );

  const invoicePreview = useMemo(
    () => buildInvoicePreview(createSelectedQuotation, pricingMode),
    [createSelectedQuotation, pricingMode]
  );

  useEffect(() => {
    if (!createSelectedQuotation) return;
    setDueDate(
      createSelectedQuotation.dueDate
        ? new Date(createSelectedQuotation.dueDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
  }, [createSelectedQuotation]);

  const openCreate = () => {
    setCreateSelectedId(quotations[0]?._id || "");
    setCreateOpen(true);
  };

  const createInvoice = async () => {
    if (!createSelectedQuotation) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.finalize(createSelectedQuotation._id, {
        invoiceType,
        pricingMode,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setCreateOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create invoice"));
    } finally {
      setSaving(false);
    }
  };

  const openTej = (invoice: CustomerInvoice) => {
    setTejInvoice(invoice);
    setTejRef(invoice.tejReference || "");
    setTejStatus(invoice.tejStatus || "NOT_SUBMITTED");
    setTejOpen(true);
  };

  const saveTej = async () => {
    if (!tejInvoice) return;
    try {
      setTejSaving(true);
      await financeService.updateInvoiceTej(tejInvoice._id, {
        tejReference: tejRef,
        tejStatus,
      });
      setTejOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Échec de la mise à jour TEJ"));
    } finally {
      setTejSaving(false);
    }
  };

  const tejBadge = (inv: CustomerInvoice) => {
    const s = inv.tejStatus || "NOT_SUBMITTED";
    if (s === "VALIDATED") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"><BadgeCheck size={10} />TEJ ✓</span>;
    if (s === "PENDING") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"><Clock size={10} />TEJ en attente</span>;
    if (s === "REJECTED") return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"><AlertCircle size={10} />TEJ rejeté</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><CircleDashed size={10} />Non soumis</span>;
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Créances clients
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Consultez les factures émises et créez-en de nouvelles depuis les devis acceptés livrés.
            </p>
          </div>

          <button
            onClick={openCreate}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl border border-black bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60"
          >
            Émettre une facture
          </button>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <div className={`${surface} flex items-center gap-3 px-5 py-3.5`}>
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par facture, commande ou client..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
        </div>

        {loading ? (
          <div
            className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}
          >
            <Loader2 size={16} className="animate-spin" />
            Chargement des créances...
          </div>
        ) : (
          <div className={`${surface} overflow-hidden`}>
            <div className="flex items-center gap-1 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              {(["CLIENT", "SUPPLIER"] as const).map((t) => {
                const count = filteredInvoices.filter((inv) => (inv.invoiceType || "CLIENT") === t).length;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                      typeFilter === t
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t === "CLIENT" ? "Client" : "Fournisseur"}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${typeFilter === t ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {!filteredInvoices.filter((inv) => (inv.invoiceType || "CLIENT") === typeFilter).length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Aucune facture émise pour le moment
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.filter((inv) => (inv.invoiceType || "CLIENT") === typeFilter).map((invoice) => {
                  const selected = selectedInvoice?._id === invoice._id;
                  return (
                    <div
                      key={invoice._id}
                      onClick={() => setSelectedId(invoice._id)}
                      className={`grid gap-3 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:grid-cols-[1.2fr_1fr_0.8fr_auto] ${
                        selected ? "bg-slate-50 dark:bg-slate-800/40" : ""
                      } cursor-pointer`}
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {invoice.invoiceNo}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {invoice.salesOrderId?.orderNo || "-"} · {invoice.customerName}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>{invoice.salesOrderId?.status || "-"}</p>
                        <p>{invoice.paymentStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {invoice.totalTtc.toLocaleString("fr-TN", {
                            minimumFractionDigits: 3,
                          })}{" "}
                          TND
                        </p>
                        {invoice.invoiceType === "SUPPLIER" && (
                          <div className="mt-1 flex justify-end">{tejBadge(invoice)}</div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {invoice.invoiceType === "SUPPLIER" && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openTej(invoice);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            TEJ
                          </button>
                        )}
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openInvoiceDocument(invoice, settingsRef.current);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Printer size={14} />
                          Imprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {createOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Émettre une facture
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sélectionnez le devis accepté et la base de tarification.
                  </p>
                </div>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Type de facture
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["CLIENT", "SUPPLIER"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setInvoiceType(t)}
                        className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                          invoiceType === t
                            ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {t === "CLIENT" ? "Facture Client" : "Facture Fournisseur"}
                      </button>
                    ))}
                  </div>
                  {invoiceType === "SUPPLIER" && (
                    <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      ⚡ TEJ e-facturation activé pour cette facture
                    </p>
                  )}
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Devis
                  </span>
                  <select
                    className={inputClass}
                    value={createSelectedQuotation?._id || ""}
                    onChange={(e) => setCreateSelectedId(e.target.value)}
                  >
                    {quotations.map((quotation) => (
                      <option key={quotation._id} value={quotation._id}>
                        {quotation.invoiceNo} - {quotation.salesOrderId?.orderNo || "-"} -{" "}
                        {quotation.customerName}
                      </option>
                    ))}
                  </select>
                </label>

                {createSelectedQuotation ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {createSelectedQuotation.customerName}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Commande : {createSelectedQuotation.salesOrderId?.orderNo || "-"}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Statut commande : {createSelectedQuotation.salesOrderId?.status || "-"}
                    </p>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                      Montant :{" "}
                      {createSelectedQuotation.totalTtc.toLocaleString("fr-TN", {
                        minimumFractionDigits: 3,
                      })}{" "}
                      TND
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Aucun devis accepté et livré disponible.
                  </div>
                )}

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Base de tarification
                  </span>
                  <select
                    className={inputClass}
                    value={pricingMode}
                    onChange={(e) => setPricingMode(e.target.value as "HT_BASED" | "TTC_BASED")}
                  >
                    <option value="HT_BASED">HT — prix hors taxes</option>
                    <option value="TTC_BASED">TTC — prix avant timbre</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Date d'échéance</span>
                  <input
                    className={inputClass}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <p>TVA: 19%</p>
                  <p>FODEC: 1%</p>
                  <p>Timbre Fiscal: 1 TND</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="mb-3 font-medium text-slate-900 dark:text-white">Aperçu de la facture</p>
                  <div className="space-y-2 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Sous-total HT</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {invoicePreview.subtotalHt.toLocaleString("fr-TN", {
                          minimumFractionDigits: 3,
                        })}{" "}
                        TND
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>TVA</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {invoicePreview.totalVat.toLocaleString("fr-TN", {
                          minimumFractionDigits: 3,
                        })}{" "}
                        TND
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>FODEC</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {invoicePreview.totalFodec.toLocaleString("fr-TN", {
                          minimumFractionDigits: 3,
                        })}{" "}
                        TND
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Avant timbre</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {invoicePreview.totalBeforeStamp.toLocaleString("fr-TN", {
                          minimumFractionDigits: 3,
                        })}{" "}
                        TND
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Timbre fiscal</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {invoicePreview.timbreFiscal.toLocaleString("fr-TN", {
                          minimumFractionDigits: 3,
                        })}{" "}
                        TND
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-800">
                      <span className="font-semibold text-slate-900 dark:text-white">Total TTC</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {invoicePreview.totalTtc.toLocaleString("fr-TN", {
                          minimumFractionDigits: 3,
                        })}{" "}
                        TND
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Annuler
                </button>
                <button
                  onClick={createInvoice}
                  disabled={saving || !createSelectedQuotation}
                  className="rounded-2xl border border-black bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? "Enregistrement..." : "Émettre"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {tejOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">Référence TEJ</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{tejInvoice?.invoiceNo}</p>
                </div>
                <button onClick={() => setTejOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Identifiant fiscal TEJ (DGI)</span>
                  <input
                    className={inputClass}
                    placeholder="Ex: TEJ-2024-000123"
                    value={tejRef}
                    onChange={(e) => setTejRef(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Statut</span>
                  <select
                    className={inputClass}
                    value={tejStatus}
                    onChange={(e) => setTejStatus(e.target.value as typeof tejStatus)}
                  >
                    <option value="NOT_SUBMITTED">Non soumis</option>
                    <option value="PENDING">En attente de validation</option>
                    <option value="VALIDATED">Validé par DGI</option>
                    <option value="REJECTED">Rejeté par DGI</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setTejOpen(false)} className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  Annuler
                </button>
                <button
                  onClick={saveTej}
                  disabled={tejSaving}
                  className="rounded-2xl border border-black bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                >
                  {tejSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
