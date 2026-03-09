import api from "../api";

export const stockItemService = {
  getAll: async () => (await api.get("/stock/items")).data,
  getByProductId: async (productId: string) =>
    (await api.get(`/stock/items/${productId}`)).data,
};