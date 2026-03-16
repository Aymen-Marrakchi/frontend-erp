"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  Receipt,
  RotateCcw,
  Settings,
  Truck,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const modules = [
  {
    href: "/dashboard/achat/suppliers",
    title: "Suppliers",
    description: "Manage supplier master data, categories, payment terms, and blocking.",
    icon: Building2,
  },
  {
    href: "/dashboard/achat/requests",
    title: "Purchase Requests",
    description: "Review DA requests, budget visibility, and approval workflow.",
    icon: Truck,
  },
  {
    href: "/dashboard/achat/orders",
    title: "Purchase Orders",
    description: "Generate BC from approved DA or awarded AO and follow validation.",
    icon: FileText,
  },
  {
    href: "/dashboard/achat/receipts",
    title: "Receipts",
    description: "Receive supplier goods, validate accepted quantities, and update stock.",
    icon: ClipboardCheck,
  },
  {
    href: "/dashboard/achat/invoices",
    title: "Invoices",
    description: "Register supplier invoices and validate the BC, receipt, and invoice match.",
    icon: Receipt,
  },
  {
    href: "/dashboard/achat/payments",
    title: "Payments",
    description: "Track due invoices, register settlements, and follow supplier balances.",
    icon: CreditCard,
  },
  {
    href: "/dashboard/achat/returns",
    title: "Returns",
    description: "Create supplier return notes, deduct stock, and follow refund or replacement.",
    icon: RotateCcw,
  },
  {
    href: "/dashboard/achat/reports",
    title: "Reports",
    description: "Track spend, compliance, delivery delay, budget vs actual, and top suppliers.",
    icon: BarChart3,
  },
  {
    href: "/dashboard/achat/settings",
    title: "Settings",
    description: "Configure numbering, taxes, currencies, approval mode, categories, and units.",
    icon: Settings,
  },
];

export default function PurchaseDashboardPage() {
  const { t, language } = useLanguage();
  const text =
    language === "fr"
      ? {
          cards: [
            { label: "Données de base", value: "Fournisseurs", icon: Building2 },
            { label: "Début du flux", value: "Demandes", icon: Truck },
            { label: "Flux opérationnel", value: "BC et réceptions", icon: ClipboardCheck },
            { label: "Passerelle finance", value: "Factures et paiements", icon: CreditCard },
          ],
          navTitle: "Navigation Achat",
          navSubtitle: "Ouvrez l'espace achat sur lequel vous voulez travailler.",
          modules: [
            {
              href: "/dashboard/achat/suppliers",
              title: "Fournisseurs",
              description: "Gérez les fiches fournisseurs, catégories, conditions de paiement et blocage.",
              icon: Building2,
            },
            {
              href: "/dashboard/achat/requests",
              title: "Demandes d'Achat",
              description: "Suivez les DA, la visibilité budget et le workflow d'approbation.",
              icon: Truck,
            },
            {
              href: "/dashboard/achat/orders",
              title: "Bons de Commande",
              description: "Générez les BC depuis des DA ou AO approuvés et suivez leur validation.",
              icon: FileText,
            },
            {
              href: "/dashboard/achat/receipts",
              title: "Réceptions",
              description: "Réceptionnez les marchandises, validez les quantités acceptées et mettez le stock à jour.",
              icon: ClipboardCheck,
            },
            {
              href: "/dashboard/achat/invoices",
              title: "Factures",
              description: "Enregistrez les factures fournisseurs et vérifiez le rapprochement BC, BR et facture.",
              icon: Receipt,
            },
            {
              href: "/dashboard/achat/payments",
              title: "Paiements",
              description: "Suivez les échéances, enregistrez les règlements et surveillez les soldes fournisseurs.",
              icon: CreditCard,
            },
            {
              href: "/dashboard/achat/returns",
              title: "Retours",
              description: "Créez les retours fournisseurs, déduisez le stock et suivez remboursement ou remplacement.",
              icon: RotateCcw,
            },
            {
              href: "/dashboard/achat/reports",
              title: "Rapports",
              description: "Suivez les dépenses, la conformité, les délais, le budget réalisé et les top fournisseurs.",
              icon: BarChart3,
            },
            {
              href: "/dashboard/achat/settings",
              title: "Paramètres",
              description: "Configurez la numérotation, les taxes, les devises, le workflow, les catégories et unités.",
              icon: Settings,
            },
          ],
        }
      : {
          cards: [
            { label: "Master Data", value: "Suppliers", icon: Building2 },
            { label: "Workflow Start", value: "Requests", icon: Truck },
            { label: "Operational Flow", value: "Orders & Receipts", icon: ClipboardCheck },
            { label: "Finance Bridge", value: "Invoices & Payments", icon: CreditCard },
          ],
          navTitle: "Purchase Navigation",
          navSubtitle: "Open the purchasing area you want to work on.",
          modules,
        };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("purchaseModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Truck size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("purchaseDashboard")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("purchaseDashboardSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-4">
          {text.cards.map((card) => (
            <div key={card.label} className={`${surface} flex items-center gap-4 px-5 py-5`}>
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                <card.icon size={16} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              {text.navTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {text.navSubtitle}
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {text.modules.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-900">
                  <item.icon size={18} className="text-slate-600 dark:text-slate-300" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
