import api from "../api";

export const purchaseService = {
  getStats: async () => {
    const { data } = await api.get("/purchase/stats");
    return data;
  },

  getAllEmployees: async () => {
    const { data } = await api.get("/purchase/employees");
    return data;
  },

  createEmployee: async (employeeData: {
    name: string;
    position: string;
    phone: string;
    
    salary: number;
    joinedDate: string;
  }) => {
    const { data } = await api.post("/purchase/employees", employeeData);
    return data;
  },

  updateEmployee: async (id: string, employeeData: Partial<{
    name: string;
    position: string;
    phone: string;
   
    salary: number;
    joinedDate: string;
  }>) => {
    const { data } = await api.put(`/purchase/employees/${id}`, employeeData);
    return data;
  },

  deleteEmployee: async (id: string) => {
    const { data } = await api.delete(`/purchase/employees/${id}`);
    return data;
  },
};