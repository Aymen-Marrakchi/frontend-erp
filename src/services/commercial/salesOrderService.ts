import api from "../api";

export interface SalesOrderLine {
  productId: { _id: string; name: string; sku: string } | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface ShipApproval {
  status: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  requestedAt?: string;
  requestedBy?: { _id: string; name: string } | null;
  approvedAt?: string;
  approvedBy?: { _id: string; name: string } | null;
  rejectedAt?: string;
  rejectedBy?: { _id: string; name: string } | null;
  rejectionReason?: string;
}

export interface SalesOrder {
  _id: string;
  orderNo: string;
  customerName: string;
  status: "DRAFT" | "CONFIRMED" | "PREPARED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  promisedDate?: string;
  preparedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  carrierId?: { _id: string; name: string; code: string } | null;
  shippingCost?: number;
  isUrgent?: boolean;
  shipApproval?: ShipApproval;
  notes?: string;
  createdAt?: string;
  lines: SalesOrderLine[];
}

export interface SalesOrderLinePayload {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreateSalesOrderPayload {
  orderNo: string;
  customerId?: string;
  customerName?: string;
  notes?: string;
  promisedDate?: string;
  lines: SalesOrderLinePayload[];
}

export const salesOrderService = {
  getAll: async () => (await api.get("/commercial/orders")).data,

  getById: async (id: string) =>
    (await api.get(`/commercial/orders/${id}`)).data,

  create: async (payload: CreateSalesOrderPayload) =>
    (await api.post("/commercial/orders", payload)).data,

  confirm: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/confirm`)).data,

  prepare: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/prepare`)).data,

  cancel: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/cancel`)).data,

  ship: async (id: string, payload?: { trackingNumber?: string; carrierId?: string; shippingCost?: number }) =>
    (await api.post(`/commercial/orders/${id}/ship`, payload || {})).data,

  deliver: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/deliver`)).data,

  markUrgent: async (id: string, urgent: boolean) =>
    (await api.post(`/commercial/orders/${id}/mark-urgent`, { urgent })).data,

  requestApproval: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/request-approval`)).data,

  approveShip: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/approve-ship`)).data,

  rejectShip: async (id: string, reason: string) =>
    (await api.post(`/commercial/orders/${id}/reject-ship`, { reason })).data,
};
