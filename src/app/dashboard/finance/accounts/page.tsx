"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { financeService, AccountingAccount } from "@/services/finance/financeService";
import { useEffect, useState } from "react";
import { Landmark, Loader2 } from "lucide-react";

function getErrorMessage(err: unknown) {
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
  return "Échec du chargement des comptes";
}

const entryTypeLabel: Record<string, string> = {
  INVOICE_ISSUED: "Facture émise",
  REGLEMENT_RECU: "Règlement reçu",
  PAYABLE_RECORDED: "Dette fournisseur",
  PAYABLE_PAYMENT: "Paiement fournisseur",
  PAYABLE_CREDIT: "Avoir fournisseur",
  MANUAL_ENTRY: "Écriture manuelle",
};

export default function FinanceAccountsPage() {
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [selected, setSelected] = useState<AccountingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await financeService.getAccounts();
        setAccounts(data);
        setSelected(data[0] || null);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Landmark size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Grand livre
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Soldes des comptes et historique des mouvements issus des écritures du journal
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Chargement du grand livre...
          </div>
        ) : !accounts.length ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            Aucun compte enregistré pour le moment
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            {/* Account list */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">Comptes</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((account) => (
                  <button
                    key={account.accountCode}
                    onClick={() => setSelected(account)}
                    className={`w-full px-5 py-4 text-left transition ${
                      selected?.accountCode === account.accountCode
                        ? "bg-slate-100 dark:bg-slate-800/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {account.accountCode} · {account.accountName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Débit {account.debit.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} ·
                          Crédit {account.credit.toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {account.balance.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ledger detail */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {selected
                    ? `${selected.accountCode} · ${selected.accountName}`
                    : "Sélectionner un compte"}
                </h2>
                {selected ? (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Solde :{" "}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selected.balance.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                    </span>
                  </p>
                ) : null}
              </div>

              {selected && selected.entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/40">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">Date</th>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">Référence</th>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">Type</th>
                        <th className="px-6 py-3 text-right font-medium text-slate-500">Débit</th>
                        <th className="px-6 py-3 text-right font-medium text-slate-500">Crédit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selected.entries.map((entry) => (
                        <tr key={`${selected.accountCode}-${entry.journalEntryId}-${entry.side}-${entry.amount}`}>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                            {new Date(entry.occurredAt).toLocaleDateString("fr-TN")}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                            {entry.reference || "—"}
                          </td>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                            {entryTypeLabel[entry.entryType] || entry.entryType}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900 dark:text-white">
                            {entry.side === "DEBIT"
                              ? `${entry.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`
                              : "—"}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900 dark:text-white">
                            {entry.side === "CREDIT"
                              ? `${entry.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selected ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500">
                  Aucun mouvement pour ce compte
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
