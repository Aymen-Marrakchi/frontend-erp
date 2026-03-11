export type Role =
  | "ADMIN"
  | "HR_MANAGER"
  | "MARKETING_MANAGER"
  | "SALES_MANAGER"
  | "STOCK_MANAGER"
  | "DEPOT_MANAGER"
  | "FINANCE_MANAGER"
  | "COMMERCIAL_MANAGER"
  | "PURCHASE_MANAGER"
  | "WAREHOUSE_OPERATOR"
  | "EMPLOYEE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
  department?: string;
}