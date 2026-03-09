import api from "../api";

export const stockService = {
  getStats: async () => {
    const { data } = await api.get("/stock/stats");
    return data;
  },

  getAllEmployees: async () => {
    const { data } = await api.get("/stock/employees");
    return data;
  },

  createEmployee: async (employeeData: {
    name: string;
    position: string;
    phone: string;
    
    salary: number;
    joinedDate: string;
  }) => {
    const { data } = await api.post("/stock/employees", employeeData);
    return data;
  },

  updateEmployee: async (id: string, employeeData: Partial<{
    name: string;
    position: string;
    phone: string;
   
    salary: number;
    joinedDate: string;
  }>) => {
    const { data } = await api.put(`/stock/employees/${id}`, employeeData);
    return data;
  },

  deleteEmployee: async (id: string) => {
    const { data } = await api.delete(`/stock/employees/${id}`);
    return data;
  },
};