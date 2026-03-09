import api from "../api";

export const financeService = {
  getStats: async () => {
    const { data } = await api.get("/finance/stats");
    return data;
  },

  getAllEmployees: async () => {
    const { data } = await api.get("/finance/employees");
    return data;
  },

  createEmployee: async (employeeData: {
    name: string;
    position: string;
    phone: string;
    
    salary: number;
    joinedDate: string;
  }) => {
    const { data } = await api.post("/finance/employees", employeeData);
    return data;
  },

  updateEmployee: async (id: string, employeeData: Partial<{
    name: string;
    position: string;
    phone: string;
   
    salary: number;
    joinedDate: string;
  }>) => {
    const { data } = await api.put(`/finance/employees/${id}`, employeeData);
    return data;
  },

  deleteEmployee: async (id: string) => {
    const { data } = await api.delete(`/finance/employees/${id}`);
    return data;
  },
};