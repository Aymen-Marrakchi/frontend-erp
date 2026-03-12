"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { vehicleService, Vehicle, VehicleDelivery } from "@/services/commercial/vehicleService";
import {
  Car, Plus, Pencil, Power, ChevronDown, ChevronUp,
  Weight, Package, CalendarDays, Clock, Loader2, Search, X,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-900/30";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

// ─── Durability helpers ────────────────────────────────────────────────────────
function calcDurabilityFromLifeDays(lifeExpectancyDays = 3650): number {
  if (lifeExpectancyDays < 365) return 50;
  if (lifeExpectancyDays <= 4 * 365) return 100;
  return Math.max(0, 100 - 7 * (lifeExpectancyDays - 4 * 365));
}

function calcDurability(_purchaseDate: string, lifeExpectancyDays = 3650): number {
  return calcDurabilityFromLifeDays(lifeExpectancyDays);
}

function durColor(pct: number) {
  if (pct >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400" };
  if (pct >= 50) return { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", ring: "ring-red-400" };
}

function ageStr(purchaseDate: string) {
  const ms = Date.now() - new Date(purchaseDate).getTime();
  const years = ms / (1000 * 60 * 60 * 24 * 365);
  if (years < 1) return `${Math.round(years * 12)} mois`;
  return `${years.toFixed(1)} ans`;
}

function salesLineAmount(line: { quantity: number; unitPrice: number; discount?: number }) {
  const subtotal = line.quantity * line.unitPrice;
  const discountPct = Math.min(100, Math.max(0, line.discount || 0));
  return subtotal * (1 - discountPct / 100);
}

// ─── SVG Durability Curve ─────────────────────────────────────────────────────
function DurabilityCurve({ purchaseDate, lifeExpectancyDays = 3650 }: { purchaseDate: string; lifeExpectancyDays?: number }) {
  const W = 320, H = 130, PX = 36, PY = 16;
  const plotW = W - PX - 12, plotH = H - PY - 24;
  const maxDays = Math.max(1, lifeExpectancyDays, 4 * 365 + 30);

  const points: { x: number; y: number }[] = [];
  for (let d = 0; d <= maxDays; d += Math.max(1, Math.floor(maxDays / 200))) {
    const pct = calcDurabilityFromLifeDays(d);
    points.push({
      x: PX + (d / maxDays) * plotW,
      y: PY + plotH - (pct / 100) * plotH,
    });
  }
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const ageDays = Math.min(lifeExpectancyDays, maxDays);
  const curPct = calcDurability(purchaseDate, lifeExpectancyDays);
  const curX = PX + (ageDays / maxDays) * plotW;
  const curY = PY + plotH - (curPct / 100) * plotH;
  const c = durColor(curPct);
  const strokeColor = c.bar === "bg-emerald-500" ? "#22c55e" : c.bar === "bg-amber-400" ? "#f59e0b" : "#ef4444";

  const yTicks = [0, 25, 50, 75, 100];
  const stepDays = maxDays <= 30 ? 5 : maxDays <= 180 ? 30 : maxDays <= 365 ? 60 : 365;
  const xLabels = Array.from({ length: Math.floor(maxDays / stepDays) + 1 }, (_, i) => i * stepDays).filter(
    (day) => day <= maxDays
  );

  return (
    <svg width={W} height={H} className="w-full">
      {/* Y grid */}
      {yTicks.map((pct) => {
        const y = PY + plotH - (pct / 100) * plotH;
        return (
          <g key={pct}>
            <line x1={PX} y1={y} x2={PX + plotW} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text x={PX - 4} y={y + 3.5} fontSize={8} fill="currentColor" fillOpacity={0.4} textAnchor="end">{pct}</text>
          </g>
        );
      })}
      {/* X labels */}
      {xLabels.map((day) => (
        <text key={day} x={PX + (day / maxDays) * plotW} y={H - 4} fontSize={8} fill="currentColor" fillOpacity={0.35} textAnchor="middle">{day}j</text>
      ))}
      {/* Axes */}
      <line x1={PX} y1={PY} x2={PX} y2={PY + plotH} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
      <line x1={PX} y1={PY + plotH} x2={PX + plotW} y2={PY + plotH} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
      {/* Gradient fill */}
      <defs>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${PX},${PY + plotH} ${polyline} ${PX + plotW},${PY + plotH}`}
        fill="url(#curveGrad)"
      />
      {/* Curve */}
      <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
      {/* Current marker */}
      <line x1={curX} y1={PY} x2={curX} y2={PY + plotH} stroke={strokeColor} strokeWidth={1.5} strokeDasharray="4,3" />
      <circle cx={curX} cy={curY} r={5} fill={strokeColor} fillOpacity={0.2} stroke={strokeColor} strokeWidth={2} />
      <circle cx={curX} cy={curY} r={2.5} fill={strokeColor} />
      {/* Tooltip */}
      <rect x={curX + 7} y={curY - 14} width={32} height={14} rx={4} fill={strokeColor} fillOpacity={0.15} />
      <text x={curX + 23} y={curY - 3} fontSize={9} fill={strokeColor} fontWeight="700" textAnchor="middle">
        {curPct.toFixed(0)}%
      </text>
    </svg>
  );
}

// ─── Durability ring ──────────────────────────────────────────────────────────
function DurabilityRing({ pct }: { pct: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const c = durColor(pct);
  const stroke = c.bar === "bg-emerald-500" ? "#22c55e" : c.bar === "bg-amber-400" ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
      <svg width={56} height={56} className="-rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={5} />
        <circle
          cx={28} cy={28} r={r} fill="none"
          stroke={stroke} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-xs font-bold ${c.text}`}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────
function VehicleCard({
  vehicle,
  onEdit,
  onToggle,
}: {
  vehicle: Vehicle;
  onEdit: (v: Vehicle) => void;
  onToggle: (v: Vehicle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<VehicleDelivery[]>([]);
  const [loadingDel, setLoadingDel] = useState(false);
  const durPct = vehicle.durabilityPercent ?? calcDurability(vehicle.purchaseDate, vehicle.lifeExpectancyDays);
  const c = durColor(durPct);
  const history = useMemo(() => {
    const orders = deliveries.flatMap((delivery) => delivery.orderIds || []);
    const orderCount = orders.length;
    const income = orders.reduce(
      (sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + salesLineAmount(line), 0),
      0
    );
    const fuelOutcome = orders.reduce((sum, order) => sum + (order.shippingCost || 0), 0);

    return { orderCount, income, fuelOutcome };
  }, [deliveries]);

  const toggleOpen = async () => {
    if (!open && deliveries.length === 0) {
      setLoadingDel(true);
      try { setDeliveries(await vehicleService.getDeliveries(vehicle._id)); }
      catch { /* ignore */ }
      finally { setLoadingDel(false); }
    }
    setOpen((p) => !p);
  };

  return (
    <div className={`${surface} overflow-hidden transition-shadow hover:shadow-md`}>
      {/* Card header */}
      <div className="flex items-center gap-4 p-5">
        <DurabilityRing pct={durPct} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-wide">
              {vehicle.matricule}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              vehicle.active
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              {vehicle.active ? "Actif" : "Inactif"}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Weight size={11} /> {vehicle.capacityKg} kg</span>
            <span className="flex items-center gap-1"><Package size={11} /> {vehicle.capacityPackets} colis</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {ageStr(vehicle.purchaseDate)}</span>
            <span className="flex items-center gap-1"><CalendarDays size={11} /> {vehicle.lifeExpectancyDays} jours (durée de vie)</span>
          </div>
          {/* Durability bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-1.5 rounded-full transition-all ${c.bar}`}
                style={{ width: `${durPct}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold ${c.text}`}>Durabilité {durPct.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(vehicle); }}
            title="Modifier"
          >
            <Pencil size={14} />
          </button>
          <button
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); onToggle(vehicle); }}
            title={vehicle.active ? "Désactiver" : "Activer"}
          >
            <Power size={14} />
          </button>
          <button
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            onClick={toggleOpen}
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 grid md:grid-cols-2 gap-0">
          {/* Curve */}
          <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Courbe de Durabilité
            </p>
            <DurabilityCurve purchaseDate={vehicle.purchaseDate} lifeExpectancyDays={vehicle.lifeExpectancyDays} />
            {vehicle.notes && (
              <p className="mt-3 text-xs text-slate-400 italic">{vehicle.notes}</p>
            )}
          </div>

          {/* Delivery logs */}
          <div className="p-5">
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Orders</p>
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{history.orderCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Income</p>
                <p className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {history.income.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Carburant</p>
                <p className="mt-2 text-lg font-bold text-rose-600 dark:text-rose-400">
                  {history.fuelOutcome.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Historique Livraisons
            </p>
            {loadingDel ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Chargement...
              </div>
            ) : deliveries.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune livraison enregistrée.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {deliveries.map((d) => (
                  <div key={d._id} className="flex items-center justify-between text-xs rounded-2xl px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-white">{d.planNo}</span>
                      {d.zone && <span className="text-slate-400">{d.zone}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-400">{d.orderIds.length} cmd</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        d.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                        d.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" :
                        d.status === "CANCELLED" ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" :
                        "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }`}>{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface FormState {
  matricule: string;
  capacityKg: string;
  capacityPackets: string;
  purchaseDate: string;
  lifeExpectancyDays: string;
  durabilityPercent: string;
  notes: string;
}

const EMPTY: FormState = {
  matricule: "",
  capacityKg: "",
  capacityPackets: "",
  purchaseDate: "",
  lifeExpectancyDays: "3650",
  durabilityPercent: String(calcDurabilityFromLifeDays(3650)),
  notes: "",
};

function splitMatricule(value: string) {
  const match = value.trim().toUpperCase().match(/^(\d{0,3})\s*TU\s*(\d{0,4})$/);
  return {
    left: match?.[1] || "",
    right: match?.[2] || "",
  };
}

function buildMatricule(left: string, right: string) {
  return `${left} TU ${right}`.trim();
}

function VehicleModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Vehicle;
  onClose: () => void;
  onSave: (data: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          matricule: initial.matricule,
          capacityKg: String(initial.capacityKg),
          capacityPackets: String(initial.capacityPackets),
          purchaseDate: initial.purchaseDate.split("T")[0],
          lifeExpectancyDays: String(initial.lifeExpectancyDays ?? 3650),
          durabilityPercent: String(initial.durabilityPercent ?? calcDurabilityFromLifeDays(initial.lifeExpectancyDays ?? 3650)),
          notes: initial.notes,
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const matriculeParts = splitMatricule(form.matricule);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({
        ...p,
        [field]: e.target.value,
        ...(field === "lifeExpectancyDays"
          ? {
              durabilityPercent: String(
                calcDurabilityFromLifeDays(Number(e.target.value) || 0)
              ),
            }
          : {}),
      }));

  const setMatriculePart = (part: "left" | "right") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = e.target.value.replace(/\D/g, "").slice(0, part === "left" ? 3 : 4);
      const nextLeft = part === "left" ? numericValue : matriculeParts.left;
      const nextRight = part === "right" ? numericValue : matriculeParts.right;

      setForm((p) => ({
        ...p,
        matricule: buildMatricule(nextLeft, nextRight),
      }));
    };

  // Live durability preview
  const previewPct = Number(form.durabilityPercent);
  const previewColor = previewPct !== null ? durColor(previewPct) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await onSave(form);
      onClose();
    } catch (ex: unknown) {
      setErr((ex as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${surface} w-full max-w-lg p-6 shadow-2xl`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {initial ? "Modifier le véhicule" : "Nouveau véhicule"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Matricule */}
          <div>
            <label className={labelClass}>Matricule</label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
              <input
                className={inputClass}
                placeholder="200"
                inputMode="numeric"
                maxLength={3}
                value={matriculeParts.left}
                onChange={setMatriculePart("left")}
                required
              />
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                TU
              </div>
              <input
                className={inputClass}
                placeholder="1234"
                inputMode="numeric"
                maxLength={4}
                value={matriculeParts.right}
                onChange={setMatriculePart("right")}
                required
              />
            </div>
          </div>

          {/* Capacities */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Capacité kg</label>
              <input type="number" min={0} className={inputClass} value={form.capacityKg} onChange={set("capacityKg")} required />
            </div>
            <div>
              <label className={labelClass}>Capacité colis</label>
              <input type="number" min={0} className={inputClass} value={form.capacityPackets} onChange={set("capacityPackets")} required />
            </div>
          </div>

          {/* Date + Life — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date d'achat</label>
              <input
                type="date"
                className={inputClass}
                value={form.purchaseDate}
                onChange={set("purchaseDate")}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Durée de vie (jours)</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.lifeExpectancyDays}
                onChange={set("lifeExpectancyDays")}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>DurabilitÃ© (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={form.durabilityPercent}
              onChange={set("durabilityPercent")}
              required
            />
          </div>

          {/* Live durability preview */}
          {previewPct !== null && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Durabilité actuelle calculée</p>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-2 rounded-full transition-all ${previewColor!.bar}`}
                    style={{ width: `${previewPct}%` }}
                  />
                </div>
              </div>
              <span className={`text-lg font-bold ${previewColor!.text}`}>{previewPct.toFixed(0)}%</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Optionnel..."
              value={form.notes}
              onChange={set("notes")}
            />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FleetPage() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vehicle | undefined>();

  const load = async () => {
    try { setVehicles(await vehicleService.getAll()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = vehicles.filter((v) =>
    v.matricule.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = vehicles.filter((v) => v.active).length;
  const avgDur = vehicles.length
    ? Math.round(vehicles.reduce((s, v) => s + (v.durabilityPercent ?? calcDurability(v.purchaseDate, v.lifeExpectancyDays)), 0) / vehicles.length)
    : 0;
  const atRisk = vehicles.filter((v) => (v.durabilityPercent ?? calcDurability(v.purchaseDate, v.lifeExpectancyDays)) < 50).length;

  const openCreate = () => { setEditing(undefined); setShowModal(true); };
  const openEdit = (v: Vehicle) => { setEditing(v); setShowModal(true); };

  const handleSave = async (form: FormState) => {
    const payload = {
      matricule: form.matricule.trim().toUpperCase(),
      capacityKg: Number(form.capacityKg),
      capacityPackets: Number(form.capacityPackets),
      purchaseDate: form.purchaseDate,
      lifeExpectancyDays: Number(form.lifeExpectancyDays),
      durabilityPercent: Number(form.durabilityPercent),
      notes: form.notes,
    };
    if (editing) {
      const updated = await vehicleService.update(editing._id, payload);
      setVehicles((p) => p.map((v) => (v._id === editing._id ? updated : v)));
    } else {
      const created = await vehicleService.create(payload);
      setVehicles((p) => [created, ...p]);
    }
  };

  const handleToggle = async (v: Vehicle) => {
    const updated = await vehicleService.toggleActive(v._id);
    setVehicles((p) => p.map((x) => (x._id === v._id ? updated : x)));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("fleetTitle")}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{t("fleetSub")}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          Ajouter un véhicule
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total véhicules", value: vehicles.length, icon: Car, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
          { label: "Actifs", value: totalActive, icon: Power, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "Durabilité moy.", value: `${avgDur}%`, icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
          { label: "À risque (<50%)", value: atRisk, icon: Car, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
        ].map((k) => (
          <div key={k.label} className={`${surface} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${k.bg}`}>
              <k.icon size={20} className={k.color} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 dark:focus:border-indigo-500 transition"
          placeholder="Rechercher par matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 py-8">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Chargement...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${surface} p-16 text-center`}>
          <Car size={36} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucun véhicule trouvé.</p>
          <button onClick={openCreate} className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Ajouter le premier véhicule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VehicleCard key={v._id} vehicle={v} onEdit={openEdit} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {showModal && (
        <VehicleModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}



