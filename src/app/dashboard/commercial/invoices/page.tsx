"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { customerInvoiceService, CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

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

export default function CommercialInvoicesPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pricingMode, setPricingMode] = useState<"HT_BASED" | "TTC_BASED">("HT_BASED");
  const [applyTva, setApplyTva] = useState(true);
  const [applyFodec, setApplyFodec] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"UNSET" | "ESPECE" | "CHEQUE" | "VIREMENT" | "KUMBIL">("UNSET");
  const [installmentMode, setInstallmentMode] = useState("DAYS_30");
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await customerInvoiceService.getAll();
      setInvoices(data);
      if (!selectedId && data[0]?._id) {
        setSelectedId(data[0]._id);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load customer invoices"));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice._id === selectedId) || null,
    [invoices, selectedId]
  );

  const previewTotals = useMemo(() => {
    if (!selectedInvoice) return null;

    const lineTotals = selectedInvoice.lines.map((line) => {
      const quantity = Number(line.quantity || 0);
      const inputUnitPrice = Number(line.inputUnitPrice || 0);
      const tvaRate = applyTva ? Number(selectedInvoice.tvaRate || 0) : 0;
      const fodecRate = applyFodec ? Number(selectedInvoice.fodecRate || 0) : 0;
      const multiplier = 1 + tvaRate / 100 + fodecRate / 100;
      const baseUnitHt =
        pricingMode === "TTC_BASED"
          ? (multiplier > 0 ? inputUnitPrice / multiplier : inputUnitPrice)
          : inputUnitPrice;
      const subtotalHt = baseUnitHt * quantity;
      const totalVat = subtotalHt * (tvaRate / 100);
      const totalFodec = subtotalHt * (fodecRate / 100);
      const totalBeforeStamp =
        pricingMode === "TTC_BASED"
          ? inputUnitPrice * quantity
          : subtotalHt + totalVat + totalFodec;
      return { subtotalHt, totalVat, totalFodec, totalBeforeStamp };
    });

    const subtotalHt = lineTotals.reduce((sum, line) => sum + line.subtotalHt, 0);
    const totalVat = lineTotals.reduce((sum, line) => sum + line.totalVat, 0);
    const totalFodec = lineTotals.reduce((sum, line) => sum + line.totalFodec, 0);
    const totalBeforeStamp = lineTotals.reduce((sum, line) => sum + line.totalBeforeStamp, 0);
    const timbreFiscal = Number(selectedInvoice.timbreFiscal || 0);

    return {
      subtotalHt,
      totalVat,
      totalFodec,
      timbreFiscal,
      totalTtc: totalBeforeStamp + timbreFiscal,
    };
  }, [selectedInvoice, applyFodec, applyTva, pricingMode]);

  useEffect(() => {
    if (!selectedInvoice) return;
    setPricingMode(selectedInvoice.pricingMode);
    setApplyTva(selectedInvoice.applyTva);
    setApplyFodec(selectedInvoice.applyFodec);
    setPaymentMethod(selectedInvoice.paymentMethod);
    setInstallmentsCount(selectedInvoice.installments.length || 3);
  }, [selectedInvoice]);

  const saveConfig = async () => {
    if (!selectedInvoice) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.configure(selectedInvoice._id, {
        pricingMode,
        applyTva,
        applyFodec,
        paymentMethod,
        ...(paymentMethod === "KUMBIL"
          ? {
              installmentPlan: {
                mode: installmentMode,
                installmentsCount,
                startDate: selectedInvoice.issueDate || new Date().toISOString(),
              },
            }
          : {}),
      });
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update invoice configuration"));
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      setSending(true);
      setError("");
      await customerInvoiceService.sendInvoice(selectedInvoice._id);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send invoice"));
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Customer Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Configure Tunisian invoice logic before finance legalisation and payment
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            Loading invoices
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">Invoices</h2>
              </div>
              {!invoices.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">No customer invoices yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((invoice) => (
                    <button
                      key={invoice._id}
                      onClick={() => setSelectedId(invoice._id)}
                      className={`grid w-full gap-3 px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:grid-cols-[1.2fr_1fr_0.8fr] ${selectedId === invoice._id ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{invoice.invoiceNo}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {invoice.customerName} · {invoice.salesOrderId?.orderNo || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {invoice.sentAt
                            ? `Sent ${new Date(invoice.sentAt).toLocaleDateString("fr-TN")}`
                            : "Not sent yet"}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>{invoice.legalizationStatus}</p>
                        <p>{invoice.paymentStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {invoice.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                        </p>
                        <p className="text-xs text-slate-400">{invoice.paymentMethod}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`${surface} p-6`}>
              <h2 className="font-semibold text-slate-950 dark:text-white">Invoice Logic</h2>
              {!selectedInvoice ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Select an invoice first</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-100 p-4 text-sm dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Settings defaults</p>
                    <p className="mt-2">TVA Rate: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.tvaRate.toFixed(3)}%</span></p>
                    <p>FODEC Rate: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.fodecRate.toFixed(3)}%</span></p>
                    <p>Timbre Fiscal: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.timbreFiscal.toFixed(3)} TND</span></p>
                  </div>

                  <label className="block text-sm">
                    <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Pricing Mode</span>
                    <select className={inputClass} value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "HT_BASED" | "TTC_BASED")}>
                      <option value="HT_BASED">HT Based</option>
                      <option value="TTC_BASED">TTC Based</option>
                    </select>
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={applyTva} onChange={(e) => setApplyTva(e.target.checked)} />
                      Apply TVA
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={applyFodec} onChange={(e) => setApplyFodec(e.target.checked)} />
                      Apply FODEC
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Payment Method</span>
                    <select
                      className={inputClass}
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as "UNSET" | "ESPECE" | "CHEQUE" | "VIREMENT" | "KUMBIL"
                        )
                      }
                    >
                      <option value="UNSET">Unset</option>
                      <option value="ESPECE">Espece</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="VIREMENT">Virement</option>
                      <option value="KUMBIL">Kumbil</option>
                    </select>
                  </label>

                  {paymentMethod === "KUMBIL" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Installment Mode</span>
                        <select className={inputClass} value={installmentMode} onChange={(e) => setInstallmentMode(e.target.value)}>
                          <option value="DAYS_30">Every 30 days</option>
                          <option value="DAYS_60">Every 60 days</option>
                          <option value="DAYS_90">Every 90 days</option>
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Installments</span>
                        <input type="number" min={1} className={inputClass} value={installmentsCount} onChange={(e) => setInstallmentsCount(Number(e.target.value || 1))} />
                      </label>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-100 p-4 text-sm dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Automatic preview</p>
                    <p className="mt-2">HT: <span className="font-medium text-slate-900 dark:text-white">{(previewTotals?.subtotalHt ?? selectedInvoice.subtotalHt).toFixed(3)} TND</span></p>
                    <p>TVA: <span className="font-medium text-slate-900 dark:text-white">{(previewTotals?.totalVat ?? selectedInvoice.totalVat).toFixed(3)} TND</span></p>
                    <p>FODEC: <span className="font-medium text-slate-900 dark:text-white">{(previewTotals?.totalFodec ?? selectedInvoice.totalFodec).toFixed(3)} TND</span></p>
                    <p>Timbre: <span className="font-medium text-slate-900 dark:text-white">{(previewTotals?.timbreFiscal ?? selectedInvoice.timbreFiscal).toFixed(3)} TND</span></p>
                    <p>TTC: <span className="font-medium text-slate-900 dark:text-white">{(previewTotals?.totalTtc ?? selectedInvoice.totalTtc).toFixed(3)} TND</span></p>
                    <p>Sent: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.sentAt ? new Date(selectedInvoice.sentAt).toLocaleString("fr-TN") : "No"}</span></p>
                    <p>Reminders: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.reminderCount || 0}</span></p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={saveConfig}
                      disabled={saving}
                      className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                    >
                      {saving ? "Saving..." : "Save Invoice Logic"}
                    </button>
                    <button
                      onClick={sendInvoice}
                      disabled={sending}
                      className="inline-flex items-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {sending ? "Sending..." : selectedInvoice.sentAt ? "Resend Invoice" : "Send Invoice"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
