import api from "../api";

export const purchaseRequestService = {
  getAll: async () => (await api.get("/purchase/requests")).data,

  getById: async (id: string) => (await api.get(`/purchase/requests/${id}`)).data,

  create: async (payload: {
    requestNo: string;
    productId: string;
    requestedQuantity: number;
    reason: string;
    priority?: "LOW" | "NORMAL" | "URGENT";
    notes?: string;
  }) => (await api.post("/purchase/requests", payload)).data,

  createFromAlert: async (
    alertId: string,
    payload: {
      requestNo: string;
      requestedQuantity: number;
      reason?: string;
      priority?: "LOW" | "NORMAL" | "URGENT";
      notes?: string;
    }
  ) => (await api.post(`/purchase/requests/from-alert/${alertId}`, payload)).data,

  updateStatus: async (
    id: string,
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED",
    notes?: string
  ) => (await api.patch(`/purchase/requests/${id}/status`, { status, notes })).data,
};
