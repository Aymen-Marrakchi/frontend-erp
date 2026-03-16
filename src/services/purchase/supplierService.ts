import api from "../api";

export interface Supplier {
  _id: string;
  supplierNo: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  rib?: string;
  paymentTerms?: string;
  category: string;
  rating: number;
  notes?: string;
  isBlocked: boolean;
  blockedReason?: string;
  createdAt: string;
}

export interface SupplierPayload {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  rib?: string;
  paymentTerms?: string;
  category?: string;
  rating?: number;
  notes?: string;
  blockedReason?: string;
}

export const supplierService = {
  getAll: async (): Promise<Supplier[]> =>
    (await api.get("/purchase/suppliers")).data,

  getById: async (id: string): Promise<Supplier> =>
    (await api.get(`/purchase/suppliers/${id}`)).data,

  create: async (payload: SupplierPayload): Promise<Supplier> =>
    (await api.post("/purchase/suppliers", payload)).data,

  update: async (id: string, payload: Partial<SupplierPayload>): Promise<Supplier> =>
    (await api.put(`/purchase/suppliers/${id}`, payload)).data,

  toggleBlock: async (id: string, blockedReason = ""): Promise<Supplier> =>
    (await api.post(`/purchase/suppliers/${id}/toggle-block`, { blockedReason })).data,
};
