"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { commercialSettingService, type CommercialSetting } from "@/services/commercial/commercialSettingService";
import { useEffect, useState } from "react";
import { Fuel, Loader2, Save, Settings } from "lucide-react";

const fmt = (v?: string) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function CommercialSettingsPage() {
  const [setting, setSetting] = useState<CommercialSetting | null>(null);
  const [fuelPrice, setFuelPrice] = useState("");
  const [fuelPer10Km, setFuelPer10Km] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    commercialSettingService.get()
      .then((data) => {
        setSetting(data);
        setFuelPrice(String(data.fuelPricePerLiter ?? ""));
        setFuelPer10Km(String(data.fuelPer10Km ?? ""));
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const price = Number(fuelPrice);
    const per10 = Number(fuelPer10Km);
    if (isNaN(price) || price < 0 || isNaN(per10) || per10 < 0) {
      setError("Valeurs invalides");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await commercialSettingService.update({ fuelPricePerLiter: price, fuelPer10Km: per10 });
      setSetting(updated);
      setSuccess("Paramètres enregistrés.");
    } catch {
      setError("Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Settings size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Paramètres <span className="text-teal-500">Commercial</span>
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              EMM ERP · Commercial
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Chargement...
          </div>
        ) : (
          <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <Fuel size={18} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Carburant</p>
                <p className="text-xs text-slate-400">Prix utilisé pour le calcul du coût de livraison</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Prix du litre (TND)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={fuelPrice}
                  onChange={(e) => { setFuelPrice(e.target.value); setSuccess(""); }}
                  placeholder="ex: 2.295"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Consommation (L / 10 km)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={fuelPer10Km}
                  onChange={(e) => { setFuelPer10Km(e.target.value); setSuccess(""); }}
                  placeholder="ex: 8.5"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>

            {setting?.updatedAt && (
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                Dernière mise à jour : {fmt(setting.updatedAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
