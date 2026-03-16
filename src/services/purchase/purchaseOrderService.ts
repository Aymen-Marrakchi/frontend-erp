import api from "../api";

export type PurchaseOrderStatus = "DRAFT" | "VALIDATED" | "SENT" | "RECEIVED" | "CLOSED";

export interface PurchaseOrderLine {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
  };
  description?: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discountRate: number;
  vatRate: number;
}

export interface PurchaseOrder {
  _id: string;
  orderNo: string;
  purchaseRequestId?: {
    _id: string;
    requestNo: string;
    requestedQuantity: number;
    productId?: {
      _id: string;
      name: string;
      sku: string;
    };
  } | null;
  tenderId?: {
    _id: string;
    tenderNo: string;
    selectedSupplierId?: {
      _id: string;
      supplierNo: string;
      name: string;
    } | null;
  } | null;
  supplierId: {
    _id: string;
    supplierNo: string;
    name: string;
    paymentTerms?: string;
    category?: string;
  };
  lines: PurchaseOrderLine[];
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  status: PurchaseOrderStatus;
  validationLevel: number;
  createdAt: string;
}

export const purchaseOrderService = {
  getAll: async (): Promise<PurchaseOrder[]> => (await api.get("/purchase/orders")).data,

  create: async (payload: {
    purchaseRequestId?: string;
    tenderId?: string;
    supplierId: string;
    lines?: Array<{
      productId: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discountRate?: number;
      vatRate?: number;
    }>;
    deliveryTerms?: string;
    paymentTerms?: string;
  }): Promise<PurchaseOrder> => (await api.post("/purchase/orders", payload)).data,

  updateStatus: async (
    id: string,
    status: "VALIDATED" | "SENT" | "CLOSED"
  ): Promise<PurchaseOrder> => (await api.patch(`/purchase/orders/${id}/status`, { status })).data,
};
