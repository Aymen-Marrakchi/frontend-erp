"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import {
  CommercialNotification,
  notificationService,
} from "@/services/commercial/notificationService";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Loader2, Mail, Truck, UserRound, XCircle } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function audienceBadge(audience: CommercialNotification["audience"]) {
  return audience === "CUSTOMER"
    ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function eventIcon(eventType: CommercialNotification["eventType"]) {
  return eventType === "ORDER_DELIVERED" ? CheckCircle2 : Truck;
}

export default function CommercialNotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<CommercialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      setNotifications(await notificationService.getAll());
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRead = async (id: string) => {
    try {
      setActionId(id);
      setError("");
      await notificationService.markRead(id);
      await fetchNotifications();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to mark notification as read"));
    } finally {
      setActionId(null);
    }
  };

  const kpis = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((item) => !item.isRead).length,
      customer: notifications.filter((item) => item.audience === "CUSTOMER").length,
      internal: notifications.filter((item) => item.audience === "INTERNAL").length,
    }),
    [notifications]
  );

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("commercialModule")} · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Bell size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("notificationsTitle")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("notificationsSub")}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70">
              <XCircle size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: t("total"), value: kpis.total, color: "text-slate-900 dark:text-white" },
            { label: t("unreadLabel"), value: kpis.unread, color: "text-amber-700 dark:text-amber-400" },
            { label: t("customerLabel"), value: kpis.customer, color: "text-sky-700 dark:text-sky-400" },
            { label: t("internalLabel"), value: kpis.internal, color: "text-emerald-700 dark:text-emerald-400" },
          ].map((item) => (
            <div key={item.label} className={`${surface} px-5 py-4`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {item.label}
              </p>
              <p className={`mt-2 text-3xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-950 dark:text-white">{t("commercialNotificationsTitle")}</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" /> {t("loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-400 dark:text-slate-500">
              <Bell size={28} className="opacity-30" />
              {t("noCommercialNotifications")}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((item) => {
                const Icon = eventIcon(item.eventType);
                const busy = actionId === item._id;

                return (
                  <div
                    key={item._id}
                    className={`px-6 py-4 ${item.isRead ? "" : "bg-amber-50/40 dark:bg-amber-950/10"}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Icon size={16} />
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${audienceBadge(item.audience)}`}>
                            {item.audience === "CUSTOMER" ? (
                              <>
                                <Mail size={10} className="mr-1" /> {t("customerLabel")}
                              </>
                            ) : (
                              <>
                                <UserRound size={10} className="mr-1" /> {t("internalLabel")}
                              </>
                            )}
                          </span>
                          {!item.isRead && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              {t("newLabel")}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                          {item.relatedOrderId && <span>{t("orderLabel")}: {item.relatedOrderId.orderNo}</span>}
                          {item.customerName && <span>{t("customerLabel")}: {item.customerName}</span>}
                          {item.createdAt && (
                            <span>{new Date(item.createdAt).toLocaleString("fr-TN")}</span>
                          )}
                        </div>
                      </div>

                      {!item.isRead && (
                        <button
                          onClick={() => handleRead(item._id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                        >
                          {busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                          {t("markAsRead")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
