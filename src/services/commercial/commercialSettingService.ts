import api from "../api";

export interface CommercialSetting {
  _id: string;
  fuelPricePerLiter: number;
  fuelPer10Km: number;
  updatedAt?: string;
}

export const commercialSettingService = {
  get: async (): Promise<CommercialSetting> =>
    (await api.get("/commercial/settings")).data,

  update: async (data: Partial<Pick<CommercialSetting, "fuelPricePerLiter" | "fuelPer10Km">>): Promise<CommercialSetting> =>
    (await api.put("/commercial/settings", data)).data,
};
