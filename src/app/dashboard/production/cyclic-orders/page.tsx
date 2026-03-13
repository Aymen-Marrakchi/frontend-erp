"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { cyclicOrderService, CyclicOrder, CreateCyclicOrderPayload } from "@/services/production/cyclicOrderService";
import { customerService } from "@/services/commercial/customerService";
import { stockProductService, StockProduct } from "@/services/stock/stockProductService";
import {
  RotateCcw, Plus, Pencil, ToggleLeft, ToggleRight,
  X, Loader2, RefreshCw, AlertCircle,
} from "lucide-react";

const surface = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

const FREQUENCY_PRESETS = [
  { label: "Mensuel (30j)", value: 30 },
  { label: "Bimestriel (60j)", value: 60 },
  { label: "Trimestriel (90j)", value: 90 },
  { label: "Semestriel (180j)", value: 180 },
  { label: "Annuel (365j)", value: 365 },
];

const emptyForm: CreateCyclicOrderPayload = {
  customerId: "",
  customerName: "",
  productId: "",
  quantity: 1,
  frequencyDays: 90,
  nextDueDate: "",
  notes: "",
};

export default function CyclicOrdersPage() {
  const [cyclics, setCyclics] = useState<CyclicOrder[]>([]);
  const [customers, setCustomers] = useState<{ _id: string; name: string }[]>([]);
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CyclicOrder | null>(null);
  const [form, setForm] = useState<CreateCyclicOrderPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [firingId, setFiringId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [cyclicsData, customersData, productsData] = await Promise.all([
        cyclicOrderService.getAll(),
        customerService.getAll(),
        stockProductService.getAll(),
      ]);
      setCyclics(cyclicsData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch {
      setError("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEdit = (c: CyclicOrder) => {
    setEditing(c);
    setForm({
      customerId: typeof c.customerId === "object" ? (c.customerId?._id ?? "") : c.customerId ?? "",
      customerName: c.customerName,
      productId: c.productId._id,
      quantity: c.quantity,
      frequencyDays: c.frequencyDays,
      nextDueDate: c.nextDueDate.slice(0, 10),
      notes: c.notes || "",
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customerId || !form.productId || !form.nextDueDate) {
      setError("Client, produit et date prochaine sont requis");
      return;
    }
    // auto-fill customerName from selection
    const customer = customers.find((c) => c._id === form.customerId);
    const payload = { ...form, customerName: customer?.name || form.customerName };

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await cyclicOrderService.update(editing._id, {
          quantity: payload.quantity,
          frequencyDays: payload.frequencyDays,
          nextDueDate: payload.nextDueDate,
          notes: payload.notes,
        });
      } else {
        await cyclicOrderService.create(payload);
      }
      setShowForm(false);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleFire = async (id: string) => {
    try {
      setFiringId(id);
      setError("");
      await cyclicOrderService.fire(id);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur");
    } finally {
      setFiringId(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setTogglingId(id);
      await cyclicOrderService.toggleActive(id);
      await fetchAll();
    } catch {
      setError("Erreur");
    } finally {
      setTogglingId(null);
    }
  };

  const now = new Date();
  const overdue  = cyclics.filter((c) => c.active && new Date(c.nextDueDate) <= now);
  const upcoming = cyclics.filter((c) => c.active && new Date(c.nextDueDate) > now);
  const inactive = cyclics.filter((c) => !c.active);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STOCK_MANAGER", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Production · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <RotateCcw size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Commandes Cycliques
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ordres récurrents par client et fréquence
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={15} /> Nouveau cyclique
          </button>
        </div>

        {error && !showForm && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70"><X size={14} /></button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "En retard", value: overdue.length, color: "text-rose-600 dark:text-rose-400" },
            { label: "À venir", value: upcoming.length, color: "text-amber-600 dark:text-amber-400" },
            { label: "Inactifs", value: inactive.length, color: "text-slate-400" },
          ].map((k) => (
            <div key={k.label} className={`${surface} px-5 py-4`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{k.label}</p>
              <p className={`mt-2 text-3xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-400`}>
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : cyclics.length === 0 ? (
          <div className={`${surface} flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400`}>
            <RotateCcw size={32} className="opacity-30" />
            Aucune commande cyclique
          </div>
        ) : (
          <div className={`${surface} overflow-hidden`}>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cyclics.map((c) => {
                const isOverdue = c.active && new Date(c.nextDueDate) <= now;
                const daysUntil = Math.ceil((new Date(c.nextDueDate).getTime() - now.getTime()) / 86400000);

                return (
                  <div key={c._id} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${!c.active ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{c.customerName}</p>
                        {isOverdue && (
                          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            <AlertCircle size={9} /> En retard
                          </span>
                        )}
                        {!isOverdue && c.active && daysUntil <= 14 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            Dans {daysUntil}j
                          </span>
                        )}
                        {!c.active && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400 dark:bg-slate-800">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {c.productId.name} ({c.productId.sku}) · <span className="font-medium text-slate-700 dark:text-slate-300">{c.quantity} {c.productId.unit}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Tous les {c.frequencyDays} jours ·
                        Prochain: {new Date(c.nextDueDate).toLocaleDateString("fr-TN")}
                        {c.lastFiredAt && ` · Dernier décl.: ${new Date(c.lastFiredAt).toLocaleDateString("fr-TN")}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {c.active && (
                        <button
                          onClick={() => handleFire(c._id)}
                          disabled={firingId === c._id}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                        >
                          {firingId === c._id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                          Déclencher
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(c)}
                        className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleToggle(c._id)}
                        disabled={togglingId === c._id}
                        className="flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {togglingId === c._id
                          ? <Loader2 size={11} className="animate-spin" />
                          : c.active ? <ToggleRight size={13} className="text-emerald-600" /> : <ToggleLeft size={13} />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <RotateCcw size={16} className="text-slate-600 dark:text-slate-300" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                    {editing ? "Modifier cyclique" : "Nouveau cyclique"}
                  </h2>
                </div>
                <button onClick={() => { setShowForm(false); setError(""); }} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {!editing && (
                  <div>
                    <label className={labelClass}>Client *</label>
                    <select
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— Sélectionner —</option>
                      {customers.filter((c) => (c as any).active !== false).map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editing && (
                  <div>
                    <label className={labelClass}>Produit *</label>
                    <select
                      value={form.productId}
                      onChange={(e) => setForm({ ...form, productId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— Sélectionner —</option>
                      {products.filter((p) => p.status === "ACTIVE").map((p) => (
                        <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Quantité *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fréquence (jours) *</label>
                    <select
                      value={form.frequencyDays}
                      onChange={(e) => setForm({ ...form, frequencyDays: Number(e.target.value) })}
                      className={inputClass}
                    >
                      {FREQUENCY_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                      <option value={form.frequencyDays}>Personnalisé: {form.frequencyDays}j</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Prochaine date *</label>
                  <input
                    type="date"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Ex: Client prioritaire, livraison le 1er du mois…"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
