import api from "../api";
import { SalesOrder } from "./salesOrderService";
import { Carrier } from "./carrierService";

export type DeliveryPlanStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type DeliveryPlanType = "SHIPMENT" | "DISCOVER";

export interface DeliveryPlan {
  _id: string;
  planNo: string;
  planDate: string;
  carrierId?: Carrier | null;
  zone?: string;
  startDate?: string | null;
  orderIds: SalesOrder[];
  status: DeliveryPlanStatus;
  planType: DeliveryPlanType;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
}

export interface CreateDeliveryPlanPayload {
  planNo?: string;
  planDate: string;
  carrierId?: string;
  zone?: string;
  startDate?: string;
  orderIds?: string[];
  notes?: string;
  planType?: DeliveryPlanType;
}

export const deliveryPlanService = {
  getAll: async (): Promise<DeliveryPlan[]> =>
    (await api.get("/commercial/delivery-plans")).data,

  getById: async (id: string): Promise<DeliveryPlan> =>
    (await api.get(`/commercial/delivery-plans/${id}`)).data,

  getUnassigned: async (): Promise<SalesOrder[]> =>
    (await api.get("/commercial/delivery-plans/unassigned")).data,

  create: async (payload: CreateDeliveryPlanPayload): Promise<DeliveryPlan> =>
    (await api.post("/commercial/delivery-plans", payload)).data,

  start: async (id: string): Promise<DeliveryPlan> =>
    (await api.post(`/commercial/delivery-plans/${id}/start`)).data,

  complete: async (id: string): Promise<DeliveryPlan> =>
    (await api.post(`/commercial/delivery-plans/${id}/complete`)).data,

  cancel: async (id: string): Promise<DeliveryPlan> =>
    (await api.post(`/commercial/delivery-plans/${id}/cancel`)).data,

  getDiscoveredZones: async (): Promise<string[]> =>
    (await api.get("/commercial/delivery-plans/discovered-zones")).data,
};
