"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
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

export default function FinanceReceivablesPage() {
  const { language } = useLanguage();
  const text =
    language === "fr"
      ? {
          title: "Gestion des créances",
          subtitle: "Légalisez et encaissez les factures clients depuis la finance.",
          loadError: "Échec du chargement des créances",
          paymentError: "Échec de l'enregistrement du paiement",
          chequeError: "Échec de la validation du chèque",
          reminderError: "Échec de l'envoi de la relance",
          loading: "Chargement des créances",
          openReceivables: "Créances ouvertes",
          invoices: "Factures",
          legalized: "Légalisées",
          paid: "Payées",
          invoiceList: "Factures clients",
          invoiceListSubtitle: "Sélectionnez une facture pour gérer son workflow de paiement.",
          empty: "Aucune créance pour le moment",
          notSent: "Non envoyée",
          remaining: "Reste",
          paymentWorkflow: "Workflow de paiement",
          totalOpen: "Total des créances ouvertes",
          sent: "Envoyée",
          noValue: "Non",
          noReminder: "Aucune relance",
          method: "Méthode",
          installment: "Échéance",
          selectInstallment: "Sélectionner une échéance",
          amount: "Montant",
          reference: "Référence",
          saving: "Enregistrement...",
          registerPayment: "Enregistrer le paiement",
          reminderWorkflow: "Workflow de relance",
          channel: "Canal",
          note: "Note",
          sendReminder: "Envoyer la relance",
          sendFromCommercial: "La facture doit d'abord être envoyée depuis le Commercial avant toute relance Finance.",
          pendingCheques: "Chèques en attente de validation",
          clearCheque: "Valider le chèque",
          manual: "Manuel",
          email: "Email",
          phone: "Téléphone",
          cash: "Espèce",
          cheque: "Chèque",
          transfer: "Virement",
        }
      : {
          title: "Receivables Management",
          subtitle: "Legalize and settle customer invoices from finance.",
          loadError: "Failed to load receivables",
          paymentError: "Failed to register payment",
          chequeError: "Failed to clear cheque",
          reminderError: "Failed to send reminder",
          loading: "Loading receivables",
          openReceivables: "Open Receivables",
          invoices: "Invoices",
          legalized: "Legalized",
          paid: "Paid",
          invoiceList: "Customer Invoices",
          invoiceListSubtitle: "Select an invoice to manage its payment workflow.",
          empty: "No receivables yet",
          notSent: "Not sent yet",
          remaining: "Remaining",
          paymentWorkflow: "Payment Workflow",
          totalOpen: "Total open receivables",
          sent: "Sent",
          noValue: "No",
          noReminder: "No reminder",
          method: "Method",
          installment: "Installment",
          selectInstallment: "Select installment",
          amount: "Amount",
          reference: "Reference",
          saving: "Saving...",
          registerPayment: "Register Payment",
          reminderWorkflow: "Reminder Workflow",
          channel: "Channel",
          note: "Note",
          sendReminder: "Send Reminder",
          sendFromCommercial: "Invoice must be sent from Commercial before Finance can send reminders.",
          pendingCheques: "Pending cheque clearances",
          clearCheque: "Clear cheque",
          manual: "Manual",
          email: "Email",
          phone: "Phone",
          cash: "Cash",
          cheque: "Cheque",
          transfer: "Transfer",
        };
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ESPECE");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [reference, setReference] = useState("");
  const [installmentIndex, setInstallmentIndex] = useState("");
  const [reminderChannel, setReminderChannel] = useState("MANUAL");
  const [reminderNote, setReminderNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await customerInvoiceService.getAll();
      setInvoices(data);
      if (!selectedId && data[0]?._id) setSelectedId(data[0]._id);
    } catch (err: unknown) {
      setError(getErrorMessage(err, text.loadError));
    } finally {
      setLoading(false);
    }
  }, [selectedId, text.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice._id === selectedId) || null,
    [invoices, selectedId]
  );

  const totalReceivables = useMemo(
    () =>
      invoices.reduce(
        (sum, invoice) => sum + Math.max(0, invoice.totalTtc - (invoice.amountPaid || 0)),
        0
      ),
    [invoices]
  );

  const registerPayment = async () => {
    if (!selectedInvoice) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.registerPayment(selectedInvoice._id, {
        method: paymentMethod,
        amount: Number(paymentAmount),
        reference,
        ...(paymentMethod === "KUMBIL" && installmentIndex !== ""
          ? { installmentIndex: Number(installmentIndex) }
          : {}),
      });
      setPaymentAmount("");
      setReference("");
      setInstallmentIndex("");
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, text.paymentError));
    } finally {
      setSaving(false);
    }
  };

  const clearCheque = async (paymentId: string) => {
    if (!selectedInvoice) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.clearCheque(selectedInvoice._id, paymentId);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, text.chequeError));
    } finally {
      setSaving(false);
    }
  };

  const sendReminder = async () => {
    if (!selectedInvoice) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.sendReminder(selectedInvoice._id, {
        channel: reminderChannel,
        note: reminderNote,
      });
      setReminderNote("");
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, text.reminderError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Finance · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <FileText size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {text.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {text.subtitle}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            {text.loading}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  label: text.openReceivables,
                  value: `${totalReceivables.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`,
                },
                {
                  label: text.invoices,
                  value: String(invoices.length),
                },
                {
                  label: text.legalized,
                  value: String(invoices.filter((invoice) => invoice.legalizationStatus === "LEGALISEE").length),
                },
                {
                  label: text.paid,
                  value: String(invoices.filter((invoice) => invoice.paymentStatus === "PAYEE").length),
                },
              ].map((item) => (
                <div key={item.label} className={`${surface} px-6 py-5`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className={`${surface} overflow-hidden`}>
                <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {text.invoiceList}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {text.invoiceListSubtitle}
                  </p>
                </div>

                {!invoices.length ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">{text.empty}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.map((invoice) => {
                      const remaining = Math.max(0, invoice.totalTtc - (invoice.amountPaid || 0));
                      return (
                        <button
                          key={invoice._id}
                          onClick={() => setSelectedId(invoice._id)}
                          className={`grid w-full gap-3 px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:grid-cols-[1.1fr_1fr_0.8fr] ${selectedId === invoice._id ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                        >
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{invoice.invoiceNo}</p>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                              {invoice.customerName} · {invoice.salesOrderId?.orderNo || "-"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {invoice.sentAt
                                ? `Sent ${new Date(invoice.sentAt).toLocaleDateString("fr-TN")}`
                                : text.notSent}
                            </p>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            <p>{invoice.legalizationStatus}</p>
                            <p>{invoice.paymentStatus}</p>
                            <p>{invoice.paymentMethod}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {remaining.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                            </p>
                            <p className="text-slate-400">{text.remaining}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`${surface} p-6`}>
                <h2 className="font-semibold text-slate-950 dark:text-white">{text.paymentWorkflow}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {text.totalOpen}: {totalReceivables.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                </p>

                {!selectedInvoice ? null : (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-100 p-4 text-sm dark:border-slate-800">
                      <p>{selectedInvoice.invoiceNo}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {selectedInvoice.customerName}
                      </p>
                      <p className="mt-2">TTC: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.totalTtc.toFixed(3)} TND</span></p>
                      <p>Paid: <span className="font-medium text-slate-900 dark:text-white">{(selectedInvoice.amountPaid || 0).toFixed(3)} TND</span></p>
                      <p>{text.sent}: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.sentAt ? new Date(selectedInvoice.sentAt).toLocaleString("fr-TN") : text.noValue}</span></p>
                      <p>Last reminder: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.lastReminderAt ? new Date(selectedInvoice.lastReminderAt).toLocaleString("fr-TN") : text.noReminder}</span></p>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{text.method}</span>
                      <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="ESPECE">{text.cash}</option>
                        <option value="CHEQUE">{text.cheque}</option>
                        <option value="VIREMENT">{text.transfer}</option>
                        <option value="KUMBIL">Kumbil</option>
                      </select>
                    </label>

                    {paymentMethod === "KUMBIL" && selectedInvoice.installments.length ? (
                      <label className="block text-sm">
                        <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{text.installment}</span>
                        <select className={inputClass} value={installmentIndex} onChange={(e) => setInstallmentIndex(e.target.value)}>
                          <option value="">{text.selectInstallment}</option>
                          {selectedInvoice.installments.map((item, index) => (
                            <option key={item._id} value={index}>
                              #{index + 1} · {new Date(item.dueDate).toLocaleDateString("fr-TN")} · {(item.plannedAmount - item.paidAmount).toFixed(3)} TND
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{text.amount}</span>
                      <input className={inputClass} type="number" min="0" step="0.001" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{text.reference}</span>
                      <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} />
                    </label>

                    <button
                      onClick={registerPayment}
                      disabled={saving || !paymentAmount}
                      className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                    >
                      {saving ? text.saving : text.registerPayment}
                    </button>

                    {selectedInvoice.paymentStatus !== "PAYEE" ? (
                      <div className="space-y-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{text.reminderWorkflow}</p>
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{text.channel}</span>
                          <select className={inputClass} value={reminderChannel} onChange={(e) => setReminderChannel(e.target.value)}>
                            <option value="MANUAL">{text.manual}</option>
                            <option value="EMAIL">{text.email}</option>
                            <option value="PHONE">{text.phone}</option>
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{text.note}</span>
                          <input className={inputClass} value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} />
                        </label>
                        <button
                          onClick={sendReminder}
                          disabled={saving || !selectedInvoice.sentAt}
                          className="inline-flex items-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {saving ? text.saving : text.sendReminder}
                        </button>
                        {!selectedInvoice.sentAt ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {text.sendFromCommercial}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {selectedInvoice.payments.some((payment) => payment.method === "CHEQUE" && payment.status === "PENDING") ? (
                      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="font-medium text-amber-700 dark:text-amber-300">{text.pendingCheques}</p>
                        {selectedInvoice.payments
                          .filter((payment) => payment.method === "CHEQUE" && payment.status === "PENDING")
                          .map((payment) => (
                            <div key={payment._id} className="flex items-center justify-between gap-3">
                              <span className="text-amber-700 dark:text-amber-300">
                                {payment.amount.toFixed(3)} TND · clear after {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString("fr-TN") : "-"}
                              </span>
                              <button
                                onClick={() => clearCheque(payment._id)}
                                className="rounded-xl border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:text-amber-300"
                              >
                                {text.clearCheque}
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
