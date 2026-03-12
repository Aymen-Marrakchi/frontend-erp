"use client";

import { useEffect, useMemo, useState } from "react";
import { customerService, Customer } from "@/services/commercial/customerService";
import { Globe, MapPin, Sparkles, Users } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const GOVERNORATES = [
  { id: "Bizerte", name: "Bizerte", cx: 162, cy: 50, points: "120,8 205,8 205,92 180,84 148,86 120,86" },
  { id: "Jendouba", name: "Jendouba", cx: 78, cy: 114, points: "35,60 120,60 120,168 35,168" },
  { id: "Beja", name: "Beja", cx: 148, cy: 109, points: "120,60 178,60 178,92 175,158 120,158" },
  { id: "Ariana", name: "Ariana", cx: 218, cy: 80, points: "205,68 232,68 232,92 205,92" },
  { id: "Tunis", name: "Tunis", cx: 213, cy: 102, points: "205,92 224,92 224,112 205,112" },
  { id: "Manouba", name: "Manouba", cx: 191, cy: 102, points: "178,84 205,84 205,120 178,120" },
  { id: "Ben Arous", name: "Ben Arous", cx: 221, cy: 124, points: "205,112 238,112 238,135 205,135" },
  { id: "Nabeul", name: "Nabeul", cx: 258, cy: 130, points: "225,62 290,62 296,108 289,155 273,180 255,185 238,168 225,148 225,92" },
  { id: "Zaghouan", name: "Zaghouan", cx: 208, cy: 162, points: "178,120 238,120 238,135 242,200 188,205 178,188" },
  { id: "Siliana", name: "Siliana", cx: 155, cy: 184, points: "120,158 188,158 188,210 120,210" },
  { id: "Kef", name: "Kef", cx: 88, cy: 192, points: "35,168 120,168 120,218 58,222 35,212" },
  { id: "Kairouan", name: "Kairouan", cx: 210, cy: 238, points: "178,205 248,200 248,272 178,272" },
  { id: "Sousse", name: "Sousse", cx: 260, cy: 215, points: "240,185 282,182 282,248 252,252 240,248" },
  { id: "Monastir", name: "Monastir", cx: 268, cy: 260, points: "250,248 282,248 282,270 268,278 250,270" },
  { id: "Mahdia", name: "Mahdia", cx: 272, cy: 292, points: "262,270 290,268 292,308 272,315 255,300" },
  { id: "Kasserine", name: "Kasserine", cx: 100, cy: 272, points: "35,222 162,222 162,332 35,332" },
  { id: "Sidi Bouzid", name: "Sidi Bouzid", cx: 194, cy: 295, points: "162,250 230,248 230,348 162,348" },
  { id: "Sfax", name: "Sfax", cx: 261, cy: 355, points: "232,302 295,298 295,415 232,415" },
  { id: "Gafsa", name: "Gafsa", cx: 94, cy: 362, points: "32,330 148,330 148,408 32,408" },
  { id: "Tozeur", name: "Tozeur", cx: 50, cy: 436, points: "12,404 88,404 88,470 12,470" },
  { id: "Kebili", name: "Kebili", cx: 130, cy: 472, points: "88,408 172,408 172,538 88,538" },
  { id: "Gabes", name: "Gabes", cx: 206, cy: 440, points: "165,402 252,400 252,485 165,485" },
  { id: "Medenine", name: "Medenine", cx: 240, cy: 472, points: "195,465 292,462 292,508 195,508" },
  { id: "Tataouine", name: "Tataouine", cx: 208, cy: 550, points: "158,508 258,505 258,595 158,595" },
];

function normalizeGovernorate(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ã©/g, "e")
    .replace(/Ã¨/g, "e")
    .replace(/Ã/g, "")
    .trim()
    .toLowerCase();
}

function govFill(count: number) {
  if (count === 0) return "#e2e8f0";
  if (count <= 10) return "#7dd3fc";
  return "#f59e0b";
}

function govStroke(count: number, selected: boolean) {
  if (selected) return "#0f172a";
  if (count === 0) return "#94a3b8";
  if (count <= 10) return "#0284c7";
  return "#d97706";
}

function badgeCls(count: number) {
  if (count === 0) return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  if (count <= 10) return "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
}

export default function RegionsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    customerService.getAll()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const countByGov = useMemo(
    () =>
      customers.reduce<Record<string, number>>((acc, customer) => {
        const key = normalizeGovernorate(customer.governorate);
        if (key) acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    [customers]
  );

  const selectedGov = GOVERNORATES.find((gov) => gov.id === selected) || null;
  const selectedKey = normalizeGovernorate(selected || "");
  const selectedCount = selected ? countByGov[selectedKey] || 0 : 0;
  const selectedCustomers = customers.filter(
    (customer) => normalizeGovernorate(customer.governorate) === selectedKey
  );
  const coveredGovs = GOVERNORATES.filter((gov) => (countByGov[normalizeGovernorate(gov.id)] || 0) > 0).length;
  const hotGovs = GOVERNORATES.filter((gov) => (countByGov[normalizeGovernorate(gov.id)] || 0) > 10).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Globe size={18} className="text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Carte des Regions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Repartition des clients par gouvernorat</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total clients", value: customers.length, color: "text-slate-900 dark:text-white" },
          { label: "Gouvernorats couverts", value: `${coveredGovs} / 24`, color: "text-sky-700 dark:text-sky-400" },
          { label: "Sans clients", value: 24 - coveredGovs, color: "text-slate-500" },
          { label: "Zones chargees (+10)", value: hotGovs, color: "text-amber-600 dark:text-amber-400" },
        ].map((item) => (
          <div key={item.label} className={`${surface} p-5`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <div className={`${surface} overflow-hidden`}>
          <div className="border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 px-5 py-4 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Carte Interactive
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Tunisie par gouvernorat</h2>
              </div>
              <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-950/80 dark:ring-slate-800">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Selection</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedGov?.name || "Aucune"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                Aucun client
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                1 a 10 clients
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Plus de 10
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[540px] items-center justify-center text-sm text-slate-400">Chargement...</div>
          ) : (
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_36%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
              <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:22px_22px]" />
              <svg
                viewBox="0 0 305 595"
                className="relative mx-auto w-full max-w-[320px]"
                style={{ filter: "drop-shadow(0 18px 35px rgba(15,23,42,0.14))" }}
              >
                {GOVERNORATES.map((gov) => {
                  const count = countByGov[normalizeGovernorate(gov.id)] || 0;
                  const isSelected = selected === gov.id;

                  return (
                    <g
                      key={gov.id}
                      onClick={() => setSelected(isSelected ? null : gov.id)}
                      className="cursor-pointer"
                    >
                      <polygon
                        points={gov.points}
                        fill={govFill(count)}
                        stroke={govStroke(count, isSelected)}
                        strokeWidth={isSelected ? 3 : 1.2}
                        opacity={isSelected ? 1 : 0.96}
                      />

                      {isSelected && (
                        <text
                          x={gov.cx}
                          y={gov.cy - 16}
                          textAnchor="middle"
                          fontSize={9}
                          fill="#0f172a"
                          fontWeight="700"
                        >
                          {gov.name}
                        </text>
                      )}

                      {count > 0 && (
                        <>
                          <circle cx={gov.cx} cy={gov.cy} r={11} fill={count <= 10 ? "#0369a1" : "#d97706"} opacity={0.96} />
                          <circle cx={gov.cx} cy={gov.cy} r={14} fill="transparent" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
                          <text x={gov.cx} y={gov.cy + 4} textAnchor="middle" fontSize={8} fill="white" fontWeight="700">
                            {count > 99 ? "99+" : count}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        <div className={`${surface} min-h-[400px] overflow-hidden`}>
          {selectedGov ? (
            <div className="p-5">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    selectedCount === 0
                      ? "bg-slate-100 dark:bg-slate-800"
                      : selectedCount <= 10
                        ? "bg-sky-100 dark:bg-sky-950/40"
                        : "bg-amber-100 dark:bg-amber-950/40"
                  }`}
                >
                  <MapPin
                    size={18}
                    className={
                      selectedCount === 0
                        ? "text-slate-400"
                        : selectedCount <= 10
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-amber-600 dark:text-amber-400"
                    }
                  />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{selectedGov.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedCount} client{selectedCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {selectedCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users size={28} className="mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400">Aucun client dans ce gouvernorat.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Clients</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{selectedCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Etat</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedCount > 10 ? "Zone chargee" : "Zone normale"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Focus</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        <Sparkles size={14} className="text-amber-500" />
                        {selectedGov.name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pr-1 max-h-[420px] overflow-y-auto">
                    {selectedCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{customer.name}</p>
                          <p className="truncate text-xs text-slate-400">{customer.company || customer.email || "-"}</p>
                        </div>
                        {!customer.active && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400 dark:bg-slate-700">
                            Inactif
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[350px] flex-col items-center justify-center p-5 text-center">
              <Globe size={36} className="mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cliquez sur un gouvernorat pour afficher ses clients
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={surface}>
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tous les gouvernorats</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {[...GOVERNORATES]
            .sort(
              (a, b) =>
                (countByGov[normalizeGovernorate(b.id)] || 0) -
                (countByGov[normalizeGovernorate(a.id)] || 0)
            )
            .map((gov) => {
              const count = countByGov[normalizeGovernorate(gov.id)] || 0;

              return (
                <button
                  key={gov.id}
                  onClick={() => setSelected(selected === gov.id ? null : gov.id)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                    selected === gov.id
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span className="truncate">{gov.name}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeCls(count)}`}>
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
