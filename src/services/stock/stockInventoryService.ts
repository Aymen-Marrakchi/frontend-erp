import api from "../api";

export const stockInventoryService = {
  getAll: async () => (await api.get("/stock/inventories")).data,
  getById: async (id: string) => (await api.get(`/stock/inventories/${id}`)).data,
  create: async (payload: { type: "PERIODIC" | "PERMANENT"; notes?: string; depotId?: string }) =>
    (await api.post("/stock/inventories", payload)).data,

  getLines: async (id: string) =>
    (await api.get(`/stock/inventories/${id}/lines`)).data,

  addLine: async (id: string, payload: { productId: string; countedQuantity: number; notes?: string }) =>
    (await api.post(`/stock/inventories/${id}/lines`, payload)).data,

  // Stock Manager actions
  sendToDepot: async (id: string) =>
    (await api.post(`/stock/inventories/${id}/send-to-depot`)).data,
  approveLine: async (id: string, lineId: string) =>
    (await api.post(`/stock/inventories/${id}/lines/${lineId}/approve`)).data,
  rejectLine: async (id: string, lineId: string) =>
    (await api.post(`/stock/inventories/${id}/lines/${lineId}/reject`)).data,

  // Depot Manager actions
  addDepotReason: async (id: string, lineId: string, reason: string) =>
    (await api.post(`/stock/inventories/${id}/lines/${lineId}/reason`, { reason })).data,
  submitDepotReview: async (id: string) =>
    (await api.post(`/stock/inventories/${id}/submit-review`)).data,
};