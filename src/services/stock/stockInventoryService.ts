import api from "../api";

export const stockInventoryService = {
  getAll: async () => (await api.get("/stock/inventories")).data,
  getById: async (id: string) => (await api.get(`/stock/inventories/${id}`)).data,
  create: async (payload: { type: "PERIODIC" | "PERMANENT"; notes?: string }) =>
    (await api.post("/stock/inventories", payload)).data,

  getLines: async (id: string) =>
    (await api.get(`/stock/inventories/${id}/lines`)).data,

  addLine: async (
    id: string,
    payload: { productId: string; countedQuantity: number; lotRef?: string; notes?: string }
  ) => (await api.post(`/stock/inventories/${id}/lines`, payload)).data,

  submit: async (id: string) =>
    (await api.post(`/stock/inventories/${id}/submit`)).data,

  getAdjustments: async () =>
    (await api.get("/stock/inventories/adjustments/all")).data,

  createAdjustment: async (payload: { inventoryCountLineId: string; reason: string }) =>
    (await api.post("/stock/inventories/adjustments", payload)).data,

  updateAdjustmentStatus: async (
    id: string,
    status: "APPROVED" | "REJECTED" | "APPLIED"
  ) => (await api.patch(`/stock/inventories/adjustments/${id}/status`, { status })).data,
};