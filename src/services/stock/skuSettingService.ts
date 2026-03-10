import api from "../api";

export const skuSettingService = {
  getAll: async () => (await api.get("/stock/settings/sku")).data,

  create: async (payload: { skuName: string; skuMax: number }) =>
    (await api.post("/stock/settings/sku", payload)).data,

  update: async (id: string, payload: { skuName?: string; skuMax?: number }) =>
    (await api.put(`/stock/settings/sku/${id}`, payload)).data,

  delete: async (id: string) =>
    (await api.delete(`/stock/settings/sku/${id}`)).data,
};