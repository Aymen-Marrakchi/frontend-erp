import api from "../api";

export const stockProductService = {
  getAll: async () => (await api.get("/stock/products")).data,
  getById: async (id: string) => (await api.get(`/stock/products/${id}`)).data,
  create: async (payload: {
    sku: string;
    name: string;
    type: "PRODUIT_FINI" | "SOUS_ENSEMBLE" | "COMPOSANT" | "MATIERE_PREMIERE";
    unit: "pcs" | "kg" | "l" | "m";
    isLotTracked?: boolean;
    status?: "ACTIVE" | "INACTIVE";
    purchasePrice?: number;
  }) => (await api.post("/stock/products", payload)).data,
  update: async (
    id: string,
    payload: Partial<{
      sku: string;
      name: string;
      type: "PRODUIT_FINI" | "SOUS_ENSEMBLE" | "COMPOSANT" | "MATIERE_PREMIERE";
      unit: "pcs" | "kg" | "l" | "m";
      isLotTracked: boolean;
      status: "ACTIVE" | "INACTIVE";
      purchasePrice: number;
    }>
  ) => (await api.put(`/stock/products/${id}`, payload)).data,
  delete: async (id: string) => (await api.delete(`/stock/products/${id}`)).data,
};