export function exportToCsv(
  columns: string[],
  rows: (string | number)[][],
  filename: string
) {
  const esc = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPdf(
  title: string,
  subtitle: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 297, 18, "F");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text(subtitle, 14, 16);

  const printedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  doc.text(`Imprimé le : ${printedAt}`, 297 - 14, 16, { align: "right" });

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 22,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    rowPageBreak: "auto",
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `Page ${data.pageNumber} / ${pageCount}`,
        297 / 2,
        210 - 5,
        { align: "center" }
      );
    },
  });

  doc.save(filename);
}

// ─── French number-to-words (TND: dinars + millimes) ────────────────────────
function frenchWords(amount: number): string {
  const ONES = [
    "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
    "dix-sept", "dix-huit", "dix-neuf",
  ];
  const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

  function lt100(n: number): string {
    if (n < 20) return ONES[n];
    const t = Math.floor(n / 10), o = n % 10;
    if (t === 7) return o === 0 ? "soixante-dix" : o === 1 ? "soixante et onze" : "soixante-" + ONES[10 + o];
    if (t === 8) return o === 0 ? "quatre-vingts" : "quatre-vingt-" + ONES[o];
    if (t === 9) return "quatre-vingt-" + ONES[10 + o];
    return o === 0 ? TENS[t] : o === 1 ? TENS[t] + " et un" : TENS[t] + "-" + ONES[o];
  }

  function lt1000(n: number): string {
    if (n < 100) return lt100(n);
    const h = Math.floor(n / 100), r = n % 100;
    const hs = h === 1 ? "cent" : ONES[h] + " cent";
    return r === 0 ? hs + (h > 1 ? "s" : "") : hs + " " + lt100(r);
  }

  function convert(n: number): string {
    if (n === 0) return "zéro";
    let res = "", rem = n;
    if (rem >= 1_000_000) {
      const m = Math.floor(rem / 1_000_000);
      res += (m === 1 ? "un million" : lt1000(m) + " millions") + " ";
      rem %= 1_000_000;
    }
    if (rem >= 1_000) {
      const k = Math.floor(rem / 1_000);
      res += (k === 1 ? "mille" : lt1000(k) + " mille") + " ";
      rem %= 1_000;
    }
    if (rem > 0) res += lt1000(rem);
    return res.trim();
  }

  const abs = Math.abs(amount);
  const dinars = Math.floor(abs);
  const millimes = Math.round((abs - dinars) * 1000);
  const w =
    convert(dinars) +
    (dinars !== 1 ? " dinars" : " dinar") +
    (millimes > 0
      ? " et " + convert(millimes) + (millimes !== 1 ? " millimes" : " millime")
      : "");
  return w.charAt(0).toUpperCase() + w.slice(1);
}

// ─── Invoice template types ──────────────────────────────────────────────────
export interface InvoiceTemplateLine {
  ref?: string;
  description: string;
  qty: number;
  unitPrice: number;
  totalHt: number;
}

export interface InvoiceTemplateOptions {
  docType?: string;
  companyRole?: string;
  invoiceNo: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  orderNo?: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    mf?: string;
    rne?: string;
    rib?: string;
    bank?: string;
    agence?: string;
  };
  party: { label: string; name: string; mf?: string; address?: string };
  lines?: InvoiceTemplateLine[];
  subtotalHt?: number;
  fodecRate?: number;
  totalFodec?: number;
  tvaRate?: number;
  totalVat?: number;
  totalBeforeStamp?: number;
  timbreFiscal?: number;
  totalTtc: number;
  amountPaid?: number;
}

// ─── Full invoice PDF matching Tunisian invoice layout ───────────────────────
export async function printInvoiceTemplate(
  opts: InvoiceTemplateOptions,
  filename: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, ML = 14, MR = 14;

  const co = opts.company ?? {};
  const cName   = co.name    || "Notre Société";
  const cAddr   = co.address || "";
  const cPhone  = co.phone   || "";
  const cEmail  = co.email   || "";
  const cMf     = co.mf      || "";
  const cRne    = co.rne     || "";
  const cRib    = co.rib     || "";
  const cBank   = co.bank    || "";
  const cAgence = co.agence  || "";

  const initials = cName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CO";

  const fmtD = (v?: string | null) =>
    v
      ? new Date(v).toLocaleDateString("fr-FR", {
          day: "2-digit", month: "2-digit", year: "numeric",
        })
      : "—";

  const fmtN = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat("fr-FR", {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }).format(v) + " TND"
      : "—";

  // ── Letterhead ─────────────────────────────────────────────────────────────
  doc.setFillColor(59, 130, 246);
  doc.circle(22, 22, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(initials, 22, 25, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  doc.text(cName, 37, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  if (cAddr) doc.text(cAddr, 37, 21);
  const contact = [cPhone, cEmail].filter(Boolean).join("   |   ");
  if (contact) doc.text(contact, 37, 27);

  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  const mfRne = [cMf ? `MF : ${cMf}` : "", cRne ? `RNE : ${cRne}` : ""]
    .filter(Boolean)
    .join("   |   ");
  if (mfRne) doc.text(mfRne, 37, 33);

  // FACTURE label + invoice number (right block)
  const docLabel = (opts.docType || "FACTURE").toUpperCase();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(docLabel, W - MR, 13, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(15, 15, 15);
  doc.text(opts.invoiceNo, W - MR, 24, { align: "right" });

  // Meta grid (2 columns, right side)
  const metaItems = [
    { label: "Date",      value: fmtD(opts.invoiceDate) },
    { label: "Statut",    value: (opts.paymentStatus ?? "—").replace(/_/g, " ") },
    { label: "Échéance",  value: fmtD(opts.dueDate) },
    { label: "Règlement", value: opts.paymentMethod ?? "—" },
    { label: "Commande",  value: opts.orderNo ?? "—" },
  ];
  const metaX = 130, metaCW = (W - MR - metaX) / 2;
  metaItems.forEach((m, i) => {
    const x = metaX + (i % 2) * metaCW;
    const y = 33 + Math.floor(i / 2) * 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text(m.label.toUpperCase(), x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    doc.text(String(m.value), x, y + 5);
  });

  // ── Separator ──────────────────────────────────────────────────────────────
  const sepY = 57;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(ML, sepY, W - MR, sepY);

  // ── Party boxes ────────────────────────────────────────────────────────────
  const bY = 61, bH = 26, bW = (W - ML - MR - 6) / 2;

  // VENDEUR (left)
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 228, 236);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, bY, bW, bH, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(160, 160, 160);
  doc.text((opts.companyRole || "VENDEUR").toUpperCase(), ML + 4, bY + 5.5);
  doc.setFillColor(59, 130, 246);
  doc.circle(ML + 8, bY + 15, 4.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(255, 255, 255);
  doc.text(initials, ML + 8, bY + 16.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text((doc.splitTextToSize(cName, bW - 18) as string[])[0], ML + 16, bY + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  if (cAddr) doc.text(cAddr.substring(0, 38), ML + 16, bY + 18.5);
  if (cMf)   doc.text(`MF : ${cMf}`, ML + 16, bY + 23.5);

  // CLIENT (right)
  const cliX = ML + bW + 6;
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(cliX, bY, bW, bH, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(160, 160, 160);
  doc.text(opts.party.label.toUpperCase(), cliX + 4, bY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  doc.text(
    (doc.splitTextToSize(opts.party.name, bW - 8) as string[])[0],
    cliX + 4,
    bY + 13
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  let py = bY + 18.5;
  if (opts.party.mf)      { doc.text(`MF : ${opts.party.mf}`, cliX + 4, py); py += 5; }
  if (opts.party.address) doc.text(opts.party.address.substring(0, 38), cliX + 4, py);

  // ── Line items table ───────────────────────────────────────────────────────
  const tblY = bY + bH + 6;
  const tableRows: (string | number)[][] = (opts.lines ?? []).map((l, i) => [
    i + 1,
    l.ref ?? "—",
    l.description,
    l.qty,
    fmtN(l.unitPrice),
    fmtN(l.totalHt),
  ]);
  while (tableRows.length < 8) tableRows.push(["", "", "", "", "", ""]);

  autoTable(doc, {
    head: [["N°", "Réf.", "Désignation", "Qté", "P.U. HT (TND)", "Montant HT (TND)"]],
    body: tableRows,
    startY: tblY,
    margin: { left: ML, right: MR },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      minCellHeight: 6.5,
    },
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 13, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 34, halign: "right" },
    },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    tableLineWidth: 0.1,
    tableLineColor: [210, 210, 210],
  });

  let sy = (doc as any).lastAutoTable.finalY + 7;

  // ── Financial summary ──────────────────────────────────────────────────────
  const sumX = W - MR - 88;
  const rowH = 7;

  if (opts.subtotalHt !== undefined) {
    const summaryRows = [
      { label: "Total brut HT",                          value: fmtN(opts.subtotalHt) },
      { label: `FODEC (${opts.fodecRate ?? 1} %)`,       value: fmtN(opts.totalFodec ?? 0) },
      { label: `TVA (${opts.tvaRate ?? 19} %)`,          value: fmtN(opts.totalVat ?? 0) },
      { label: "Avant timbre",                           value: fmtN(opts.totalBeforeStamp) },
      { label: "Timbre fiscal",                          value: fmtN(opts.timbreFiscal ?? 0) },
    ];
    summaryRows.forEach((r, i) => {
      doc.setFillColor(i % 2 === 0 ? 250 : 255, 251, 252);
      doc.rect(sumX, sy, 88, rowH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(r.label, sumX + 3, sy + 5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(r.value, W - MR - 2, sy + 5, { align: "right" });
      sy += rowH;
    });
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(sumX, sy + 1, W - MR, sy + 1);
    sy += 5;
  }

  // NET À PAYER TTC
  doc.setFillColor(15, 15, 15);
  doc.roundedRect(sumX, sy, 88, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("NET À PAYER TTC", sumX + 4, sy + 6);
  doc.text(fmtN(opts.totalTtc), W - MR - 2, sy + 6, { align: "right" });
  sy += 14;

  // ── Amount in words ────────────────────────────────────────────────────────
  const wY = sy + 2;
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 228, 236);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, wY, W - ML - MR, 16, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text("Arrêté la présente facture à la somme de :", ML + 5, wY + 6);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  const wordLines = doc.splitTextToSize(frenchWords(opts.totalTtc), W - ML - MR - 10) as string[];
  doc.text(wordLines[0], ML + 5, wY + 13);

  // ── Footer ─────────────────────────────────────────────────────────────────
  const fY = Math.max(wY + 22, 253);
  const fCW = (W - ML - MR) / 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);
  doc.text("Conditions de règlement", ML, fY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text(opts.paymentMethod ?? "Selon conditions convenues", ML, fY + 5);

  const bkX = ML + fCW;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(50, 50, 50);
  doc.text("Coordonnées bancaires", bkX, fY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  if (cRib)  doc.text(`RIB : ${cRib}`, bkX, fY + 5);
  if (cBank) doc.text(`Banque : ${cBank}${cAgence ? ` — ${cAgence}` : ""}`, bkX, fY + 10);

  const lgX = ML + fCW * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(180, 40, 40);
  const legalLines = doc.splitTextToSize(
    "Tout retard de paiement entraîne des pénalités de retard. TVA selon les taux légaux en vigueur. Document généré automatiquement.",
    fCW - 4
  ) as string[];
  doc.text(legalLines, lgX, fY, { lineHeightFactor: 1.5 });

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 279, W, 18, "F");
  const barText = [cName, cAddr, contact, mfRne].filter(Boolean).join("   •   ");
  const barLines = doc.splitTextToSize(barText, W - 28) as string[];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(170, 170, 170);
  doc.text(barLines[0], W / 2, 289, { align: "center" });

  doc.save(filename);
}

// ─── Legacy receipt/document print (non-invoice layout) ─────────────────────
export async function printInvoicePdf(
  docType: string,
  docNo: string,
  partyLabel: string,
  partyName: string,
  details: { label: string; value: string }[],
  amounts: { label: string; value: string; bold?: boolean; green?: boolean; red?: boolean }[],
  filename: string
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210, ML = 14, MR = 14, bodyW = W - ML - MR;

  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, W, 28, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(docType.toUpperCase(), ML, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(docNo, ML, 22);

  const printedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(`Imprimé le : ${printedAt}`, W - MR, 22, { align: "right" });

  const halfW = bodyW / 2 - 3;
  const boxY = 34, boxH = 24;

  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 228, 236);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, boxY, halfW, boxH, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.text(partyLabel.toUpperCase(), ML + 4, boxY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const nameLines = doc.splitTextToSize(partyName, halfW - 8) as string[];
  doc.text(nameLines[0], ML + 4, boxY + 17);

  const detX = ML + halfW + 6;
  const detColW = (W - MR - detX) / 2;

  details.forEach((d, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = detX + col * detColW;
    const y = boxY + 3 + row * 13;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text(d.label.toUpperCase(), x, y + 3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(25, 25, 25);
    doc.text(d.value, x, y + 10);
  });

  const sepY = boxY + Math.max(boxH, Math.ceil(details.length / 2) * 13) + 8;
  doc.setDrawColor(220, 228, 236);
  doc.setLineWidth(0.4);
  doc.line(ML, sepY, W - MR, sepY);

  const amtHeaderY = sepY + 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("RÉCAPITULATIF FINANCIER", ML, amtHeaderY);

  const tblY = amtHeaderY + 5;
  const rowH = 9;

  amounts.forEach((a, idx) => {
    const y = tblY + idx * rowH;

    doc.setFillColor(a.bold ? 241 : idx % 2 === 0 ? 248 : 255, a.bold ? 245 : 249, a.bold ? 249 : 250);
    doc.rect(ML, y, bodyW, rowH, "F");

    const fs = a.bold ? "bold" : "normal";
    const size = a.bold ? 9 : 8.5;
    doc.setFont("helvetica", fs);
    doc.setFontSize(size);
    doc.setTextColor(a.green ? 22 : a.red ? 220 : 50, a.green ? 163 : a.red ? 38 : 50, a.green ? 74 : a.red ? 38 : 50);
    doc.text(a.label, ML + 5, y + rowH - 3);

    doc.setFont("helvetica", fs);
    doc.setFontSize(size);
    doc.text(a.value, W - MR - 5, y + rowH - 3, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(ML, y + rowH, W - MR, y + rowH);
  });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(ML, tblY, bodyW, amounts.length * rowH, "S");

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(ML, 287, W - MR, 287);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("Page 1 / 1", W / 2, 292, { align: "center" });

  doc.save(filename);
}
