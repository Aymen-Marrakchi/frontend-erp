import api from "../api";

export interface SalesOrderLinePayload {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateSalesOrderPayload {
  orderNo: string;
  customerName: string;
  notes?: string;
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

  cancel: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/cancel`)).data,

  ship: async (id: string) =>
    (await api.post(`/commercial/orders/${id}/ship`)).data,
};