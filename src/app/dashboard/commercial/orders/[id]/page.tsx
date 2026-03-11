"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { salesOrderService, SalesOrder } from "@/services/commercial/salesOrderService";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const badgeClass = (status: SalesOrder["status"]) => {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    case "PREPARED":
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300";
    case "SHIPPED":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "DELIVERED":
      return "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300";
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function CommercialOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await salesOrderService.getById(params.id);
        setOrder(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchOrder();
  }, [params.id]);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce(
      (sum, line) => sum + line.quantity * (line.unitPrice || 0),
      0
    );
  }, [order]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <ShoppingCart size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Commercial Module · ERP
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Order Details
            </h1>
          </div>
        </div>

        <Link
          href="/dashboard/commercial/orders"
          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back to orders
        </Link>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : !order ? (
          <div className={`${surface} px-6 py-12 text-sm text-slate-500 dark:text-slate-400`}>
            Order not found.
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className={`${surface} p-6 xl:col-span-2`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Order No
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {order.orderNo}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Customer: {order.customerName}
                    </p>
                  </div>

                   <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
  {order.promisedDate && (
    <p>Promised date: {new Date(order.promisedDate).toLocaleDateString("fr-TN")}</p>
  )}
  {order.preparedAt && (
    <p>Prepared at: {new Date(order.preparedAt).toLocaleDateString("fr-TN")}</p>
  )}
  {order.shippedAt && (
    <p>Shipped at: {new Date(order.shippedAt).toLocaleDateString("fr-TN")}</p>
  )}
  {order.deliveredAt && (
    <p>Delivered at: {new Date(order.deliveredAt).toLocaleDateString("fr-TN")}</p>
  )}
  {order.trackingNumber && <p>Tracking number: {order.trackingNumber}</p>}
</div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass(order.status)}`}>
                      {order.status}
                    </span>
                    {order.promisedDate &&
                      !["DELIVERED", "CANCELLED"].includes(order.status) &&
                      new Date(order.promisedDate) < new Date() && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                          <Clock size={11} />
                          Late
                        </span>
                      )}
                  </div>
                </div>

                {order.notes ? (
                  <div className="mt-6 rounded-2xl border border-slate-100 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {order.notes}
                  </div>
                ) : null}
              </div>

              <div className={`${surface} p-6`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Total
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {total.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {order.lines.length} line(s)
                </p>
              </div>
            </div>

            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">Order Lines</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      <th className="px-6 py-3 font-medium">Product</th>
                      <th className="px-6 py-3 font-medium">SKU</th>
                      <th className="px-6 py-3 font-medium">Quantity</th>
                      <th className="px-6 py-3 font-medium">Unit Price</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {order.lines.map((line, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {line.productId?.name || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {line.productId?.sku || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {line.quantity}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {line.unitPrice.toLocaleString("fr-TN", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          TND
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {(line.quantity * line.unitPrice).toLocaleString("fr-TN", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          TND
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="border-t border-slate-200 dark:border-slate-800">
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                      >
                        Total
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                        {total.toLocaleString("fr-TN", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        TND
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}