"use client";

import { useEffect, useMemo, useState } from "react";
import { customerService, Customer } from "@/services/commercial/customerService";
import { deliveryPlanService } from "@/services/commercial/deliveryPlanService";
import { Globe, MapPin, Sparkles, Users } from "lucide-react";
const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const GOVERNORATES: readonly { id: string; name: string }[] = [
  { id: "ariana", name: "Ariana" },
  { id: "beja", name: "Béja" },
  { id: "ben arous", name: "Ben Arous" },
  { id: "bizerte", name: "Bizerte" },
  { id: "gabes", name: "Gabès" },
  { id: "gafsa", name: "Gafsa" },
  { id: "jendouba", name: "Jendouba" },
  { id: "kairouan", name: "Kairouan" },
  { id: "kasserine", name: "Kasserine" },
  { id: "kebili", name: "Kébili" },
  { id: "le kef", name: "Le Kef" },
  { id: "mahdia", name: "Mahdia" },
  { id: "la manouba", name: "La Manouba" },
  { id: "medenine", name: "Medenine" },
  { id: "monastir", name: "Monastir" },
  { id: "nabeul", name: "Nabeul" },
  { id: "sfax", name: "Sfax" },
  { id: "sidi bouzid", name: "Sidi Bouzid" },
  { id: "siliana", name: "Siliana" },
  { id: "sousse", name: "Sousse" },
  { id: "tataouine", name: "Tataouine" },
  { id: "tozeur", name: "Tozeur" },
  { id: "tunis", name: "Tunis" },
  { id: "zaghouan", name: "Zaghouan" },
] as const;

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

function badgeCls(count: number, discovered: boolean) {
  if (count === 0 && discovered) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
  if (count === 0) return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  if (count <= 10) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
}

export default function RegionsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discoveredZones, setDiscoveredZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      customerService.getAll(),
      deliveryPlanService.getDiscoveredZones(),
    ]).then(([c, d]) => {
      setCustomers(c);
      setDiscoveredZones(d);
    }).finally(() => setLoading(false));
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
  const discoveredNormalized = discoveredZones.map(normalizeGovernorate);
  const isDiscovered = (govId: string) => discoveredNormalized.some((d) => d === normalizeGovernorate(govId));

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
          { label: "Zones chargees (+10)", value: hotGovs, color: "text-red-600 dark:text-red-400" },
        ].map((item) => (
          <div key={item.label} className={`${surface} p-5`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className={`${surface} min-h-[400px] overflow-hidden`}>
          {selectedGov ? (
            <div className="p-5">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    selectedCount === 0 && isDiscovered(selected!)
                      ? "bg-yellow-100 dark:bg-yellow-950/40"
                      : selectedCount === 0
                        ? "bg-slate-100 dark:bg-slate-800"
                        : selectedCount <= 10
                          ? "bg-emerald-100 dark:bg-emerald-950/40"
                          : "bg-red-100 dark:bg-red-950/40"
                  }`}
                >
                  <MapPin
                    size={18}
                    className={
                      selectedCount === 0 && isDiscovered(selected!)
                        ? "text-yellow-600 dark:text-yellow-400"
                        : selectedCount === 0
                          ? "text-slate-400"
                          : selectedCount <= 10
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
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
                  {isDiscovered(selected!) ? (
                    <>
                      <MapPin size={28} className="mb-2 text-yellow-400" />
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Région visitée</p>
                      <p className="mt-1 text-xs text-slate-400">Aucun client trouvé lors de la prospection.</p>
                    </>
                  ) : (
                    <>
                      <Users size={28} className="mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm text-slate-400">Aucun client dans ce gouvernorat.</p>
                    </>
                  )}
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
              const discovered = isDiscovered(gov.id);

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
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeCls(count, discovered)}`}>
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
