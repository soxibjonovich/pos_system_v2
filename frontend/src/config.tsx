export const API_URL = "http://127.0.0.1"

export const api = {
  auth: {
    base: `${API_URL}/api/auth`,
    login: "login",
    logout: "logout",
    users_option: "users/login-options"
  },
  admin: {
    base: `${API_URL}/api/admin`,
    users: "users",
    roles: "roles",
    orders: "orders",
    products: "products"
  },
  database: {
    
  },
  staff: {
    base: `${API_URL}/api/staff`,
    products: "products",
    categories: "categories",
    orders: "orders"
  }
} as const;

