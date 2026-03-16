import api from "../api";

export interface PurchaseReturn {
  _id: string;
  returnNo: string;
  supplierId: {
    _id: string;
    supplierNo: string;
    name: string;
  };
  purchaseInvoiceId: {
    _id: string;
    invoiceNo: string;
    totalTtc: number;
    creditNoteAmount: number;
  };
  purchaseReceiptId: {
    _id: string;
    receiptNo: string;
    receiptStatus: string;
  };
  reason: "DEFECT" | "DELIVERY_ERROR" | "NON_CONFORMITY";
  lines: Array<{
    _id: string;
    productId: {
      _id: string;
      name: string;
      sku: string;
    };
    purchaseReceiptLineId: string;
    quantity: number;
    lotRef?: string;
  }>;
  refundAmount: number;
  status: "CREATED" | "REFUNDED" | "REPLACED" | "CLOSED";
  notes?: string;
  createdAt: string;
}

export const purchaseReturnService = {
  getAll: async (): Promise<PurchaseReturn[]> => (await api.get("/purchase/returns")).data,

  create: async (payload: {
    supplierId: string;
    purchaseInvoiceId: string;
    purchaseReceiptId: string;
    reason: "DEFECT" | "DELIVERY_ERROR" | "NON_CONFORMITY";
    lines: Array<{
      purchaseReceiptLineId: string;
      quantity: number;
      lotRef?: string;
    }>;
    refundAmount?: number;
    notes?: string;
  }): Promise<PurchaseReturn> => (await api.post("/purchase/returns", payload)).data,

  updateStatus: async (
    id: string,
    status: "REFUNDED" | "REPLACED" | "CLOSED"
  ): Promise<PurchaseReturn> => (await api.patch(`/purchase/returns/${id}/status`, { status })).data,
};
