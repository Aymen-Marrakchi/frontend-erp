import api from "../api";

export const commercialService = {
  getStats: async () => {
    const { data } = await api.get("/commercial/stats");
    return data;
  },

  getAllEmployees: async () => {
    const { data } = await api.get("/commercial/employees");
    return data;
  },

  createEmployee: async (employeeData: {
    name: string;
    position: string;
    phone: string;
    
    salary: number;
    joinedDate: string;
  }) => {
    const { data } = await api.post("/commercial/employees", employeeData);
    return data;
  },

  updateEmployee: async (id: string, employeeData: Partial<{
    name: string;
    position: string;
    phone: string;
   
    salary: number;
    joinedDate: string;
  }>) => {
    const { data } = await api.put(`/commercial/employees/${id}`, employeeData);
    return data;
  },

  deleteEmployee: async (id: string) => {
    const { data } = await api.delete(`/commercial/employees/${id}`);
    return data;
  },
};