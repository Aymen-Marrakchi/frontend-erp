import api from "../api";

export type PurchaseReceiptStatus = "PARTIAL" | "FULL" | "LITIGATION";

export interface PurchaseReceiptLine {
  _id: string;
  purchaseOrderLineId: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
  };
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  qualityStatus: "ACCEPTED" | "WITH_RESERVATION" | "REJECTED";
  discrepancyNotes?: string;
  lotRef?: string;
}

export interface PurchaseReceipt {
  _id: string;
  receiptNo: string;
  purchaseOrderId: {
    _id: string;
    orderNo: string;
    status: string;
    supplierId?: {
      _id: string;
      supplierNo: string;
      name: string;
    };
  };
  supplierId: {
    _id: string;
    supplierNo: string;
    name: string;
  };
  lines: PurchaseReceiptLine[];
  receiptStatus: PurchaseReceiptStatus;
  notes?: string;
  createdAt: string;
}

export const purchaseReceiptService = {
  getAll: async (): Promise<PurchaseReceipt[]> => (await api.get("/purchase/receipts")).data,

  create: async (payload: {
    purchaseOrderId: string;
    lines: Array<{
      purchaseOrderLineId: string;
      receivedQuantity: number;
      acceptedQuantity: number;
      qualityStatus?: "ACCEPTED" | "WITH_RESERVATION" | "REJECTED";
      discrepancyNotes?: string;
      lotRef?: string;
    }>;
    notes?: string;
  }): Promise<PurchaseReceipt> => (await api.post("/purchase/receipts", payload)).data,
};
