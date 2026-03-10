export const API_URL = "http://localhost";

export const api = {
  auth: {
    base: "/api/auth",
    login: "login",
    logout: "logout",
    refresh: "refresh",
    users_option: "users/login-options",
  },
  admin: {
    base: "/api/admin",
    users: "users",
    categories: "categories",
    products: "products",
    printers: "printers",
    tables: "tables",
    reports: "reports",
    systemConfig: "system-config",
  },
  orders: {
    base: "/api/order",
    orders: "orders",
    config: "orders/config",
    tables: "orders/tables",
  },
  staff: {
    base: `${API_URL}/api/staff`,
    products: "products",
    categories: "categories",
    printers: "printers",
    orders: "orders",
    tables: "tables",
  },
  printer: {
    base: "/api/printer",
    receipts: "receipts",
    test: "receipts/test",
    download: (orderId: number) => `receipts/${orderId}/download`,
    history: (orderId: number) => `receipts/history/${orderId}`,
  },
};
