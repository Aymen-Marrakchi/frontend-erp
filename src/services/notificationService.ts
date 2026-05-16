import api from "@/services/api";

export type NotificationModule = "COMMERCIAL" | "FINANCE" | "STOCK" | "PURCHASE";

export interface AppNotification {
  _id: string;
  module: NotificationModule;
  eventType: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  createdBy?: { _id: string; name: string; role: string } | null;
}

export const appNotificationService = {
  async getAll(): Promise<AppNotification[]> {
    const { data } = await api.get<AppNotification[]>("/notifications");
    return data;
  },
  async markRead(id: string): Promise<AppNotification> {
    const { data } = await api.post<AppNotification>(`/notifications/${id}/read`);
    return data;
  },
};
