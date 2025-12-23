# POS System API Structure

## Base URL
```
https://api.site.com/v1
```

## Authentication
All endpoints require authentication via Bearer token
```
Authorization: Bearer {access_token}
```

---

## 1. Authentication & User Management

### Auth
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset

### Users
- `GET /users` - List all users
- `GET /users/{id}` - Get user details
- `POST /users` - Create new user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `GET /users/{id}/permissions` - Get user permissions

### Roles & Permissions
- `GET /roles` - List all roles
- `POST /roles` - Create role
- `PUT /roles/{id}` - Update role
- `DELETE /roles/{id}` - Delete role

---

## 2. Business Configuration

### Business Settings
- `GET /business` - Get business details
- `PUT /business` - Update business details
- `GET /business/locations` - List all locations/branches
- `POST /business/locations` - Add new location
- `PUT /business/locations/{id}` - Update location
- `DELETE /business/locations/{id}` - Delete location

### Business Type Settings
- `GET /business/type` - Get current business type (restaurant/shop)
- `PUT /business/type` - Update business type and features

---

## 3. Product/Menu Management

### Products (Shop Mode)
- `GET /products` - List all products
- `GET /products/{id}` - Get product details
- `POST /products` - Create new product
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product
- `POST /products/bulk-import` - Bulk import products
- `GET /products/search?q={query}` - Search products
- `GET /products/barcode/{barcode}` - Get product by barcode

### Menu Items (Restaurant Mode)
- `GET /menu` - List all menu items
- `GET /menu/{id}` - Get menu item details
- `POST /menu` - Create menu item
- `PUT /menu/{id}` - Update menu item
- `DELETE /menu/{id}` - Delete menu item
- `GET /menu/categories` - List menu categories
- `POST /menu/categories` - Create menu category

### Modifiers (Restaurant Mode)
- `GET /modifiers` - List all modifiers
- `POST /modifiers` - Create modifier (e.g., extra cheese, no onions)
- `PUT /modifiers/{id}` - Update modifier
- `DELETE /modifiers/{id}` - Delete modifier
- `GET /modifiers/groups` - List modifier groups

### Categories
- `GET /categories` - List all categories
- `POST /categories` - Create category
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category

### Variants
- `GET /products/{id}/variants` - List product variants
- `POST /products/{id}/variants` - Add variant (size, color, etc.)
- `PUT /variants/{id}` - Update variant
- `DELETE /variants/{id}` - Delete variant

---

## 4. Inventory Management

### Stock
- `GET /inventory` - List all inventory items
- `GET /inventory/{product_id}` - Get stock for specific product
- `PUT /inventory/{product_id}` - Update stock levels
- `POST /inventory/adjustment` - Manual stock adjustment
- `GET /inventory/low-stock` - Get low stock alerts
- `POST /inventory/transfer` - Transfer stock between locations

### Stock History
- `GET /inventory/{product_id}/history` - Get stock movement history
- `GET /inventory/movements` - List all stock movements

### Suppliers
- `GET /suppliers` - List all suppliers
- `POST /suppliers` - Create supplier
- `PUT /suppliers/{id}` - Update supplier
- `DELETE /suppliers/{id}` - Delete supplier

### Purchase Orders
- `GET /purchase-orders` - List purchase orders
- `POST /purchase-orders` - Create purchase order
- `PUT /purchase-orders/{id}` - Update purchase order
- `POST /purchase-orders/{id}/receive` - Receive purchase order
- `DELETE /purchase-orders/{id}` - Cancel purchase order

---

## 5. Orders & Sales

### Orders
- `GET /orders` - List all orders
- `GET /orders/{id}` - Get order details
- `POST /orders` - Create new order
- `PUT /orders/{id}` - Update order (before payment)
- `DELETE /orders/{id}` - Cancel order
- `POST /orders/{id}/items` - Add item to order
- `DELETE /orders/{id}/items/{item_id}` - Remove item from order
- `PUT /orders/{id}/items/{item_id}` - Update order item

### Order Status (Restaurant Mode)
- `PUT /orders/{id}/status` - Update order status (pending, preparing, ready, served)
- `GET /orders/kitchen` - Get kitchen display orders
- `PUT /orders/{id}/priority` - Set order priority

### Tables (Restaurant Mode)
- `GET /tables` - List all tables
- `POST /tables` - Create table
- `PUT /tables/{id}` - Update table
- `DELETE /tables/{id}` - Delete table
- `GET /tables/{id}/orders` - Get orders for specific table
- `POST /tables/{id}/merge` - Merge tables
- `POST /tables/{id}/split` - Split table bill

### Reservations (Restaurant Mode)
- `GET /reservations` - List reservations
- `POST /reservations` - Create reservation
- `PUT /reservations/{id}` - Update reservation
- `DELETE /reservations/{id}` - Cancel reservation

---

## 6. Payment Processing

### Payments
- `POST /orders/{id}/payment` - Process payment
- `GET /orders/{id}/payments` - List payments for order
- `POST /orders/{id}/refund` - Process refund
- `POST /orders/{id}/split-payment` - Split payment between multiple methods

### Payment Methods
- `GET /payment-methods` - List available payment methods
- `POST /payment-methods` - Add payment method
- `PUT /payment-methods/{id}` - Update payment method
- `DELETE /payment-methods/{id}` - Remove payment method

### Transactions
- `GET /transactions` - List all transactions
- `GET /transactions/{id}` - Get transaction details
- `POST /transactions/{id}/void` - Void transaction

---

## 7. Customer Management

### Customers
- `GET /customers` - List all customers
- `GET /customers/{id}` - Get customer details
- `POST /customers` - Create customer
- `PUT /customers/{id}` - Update customer
- `DELETE /customers/{id}` - Delete customer
- `GET /customers/search?q={query}` - Search customers
- `GET /customers/{id}/orders` - Get customer order history

### Loyalty Programs
- `GET /loyalty` - Get loyalty program details
- `POST /loyalty/enroll` - Enroll customer in loyalty program
- `GET /customers/{id}/loyalty` - Get customer loyalty points
- `POST /customers/{id}/loyalty/redeem` - Redeem loyalty points
- `POST /customers/{id}/loyalty/adjust` - Adjust loyalty points

---

## 8. Discounts & Promotions

### Discounts
- `GET /discounts` - List all discounts
- `POST /discounts` - Create discount
- `PUT /discounts/{id}` - Update discount
- `DELETE /discounts/{id}` - Delete discount
- `POST /orders/{id}/apply-discount` - Apply discount to order
- `POST /orders/{id}/remove-discount` - Remove discount from order

### Coupons
- `GET /coupons` - List all coupons
- `POST /coupons` - Create coupon
- `PUT /coupons/{id}` - Update coupon
- `POST /coupons/validate` - Validate coupon code

---

## 9. Reporting & Analytics

### Sales Reports
- `GET /reports/sales/summary` - Sales summary
- `GET /reports/sales/daily` - Daily sales report
- `GET /reports/sales/by-product` - Sales by product
- `GET /reports/sales/by-category` - Sales by category
- `GET /reports/sales/by-employee` - Sales by employee
- `GET /reports/sales/by-location` - Sales by location

### Inventory Reports
- `GET /reports/inventory/valuation` - Inventory valuation
- `GET /reports/inventory/turnover` - Inventory turnover
- `GET /reports/inventory/wastage` - Wastage report (restaurant)

### Financial Reports
- `GET /reports/financial/profit-loss` - Profit & loss statement
- `GET /reports/financial/tax` - Tax report
- `GET /reports/financial/payment-methods` - Payment methods breakdown

### Custom Reports
- `POST /reports/custom` - Generate custom report
- `GET /reports/export` - Export report (CSV, PDF, Excel)

---

## 10. Employee Management

### Employees
- `GET /employees` - List all employees
- `GET /employees/{id}` - Get employee details
- `POST /employees` - Create employee
- `PUT /employees/{id}` - Update employee
- `DELETE /employees/{id}` - Delete employee

### Time Tracking
- `POST /employees/{id}/clock-in` - Clock in
- `POST /employees/{id}/clock-out` - Clock out
- `GET /employees/{id}/timesheet` - Get employee timesheet
- `PUT /timesheets/{id}` - Update timesheet entry

### Shifts
- `GET /shifts` - List all shifts
- `POST /shifts` - Create shift
- `PUT /shifts/{id}` - Update shift
- `DELETE /shifts/{id}` - Delete shift

---

## 11. Kitchen Display System (Restaurant Mode)

### Kitchen Orders
- `GET /kitchen/orders` - Get all active kitchen orders
- `GET /kitchen/orders/{id}` - Get specific order details
- `PUT /kitchen/orders/{id}/start` - Mark order as started
- `PUT /kitchen/orders/{id}/ready` - Mark order as ready
- `GET /kitchen/stations` - List kitchen stations
- `GET /kitchen/stations/{id}/orders` - Get orders for specific station

---

## 12. Tax Management

### Taxes
- `GET /taxes` - List all tax rates
- `POST /taxes` - Create tax rate
- `PUT /taxes/{id}` - Update tax rate
- `DELETE /taxes/{id}` - Delete tax rate
- `POST /taxes/calculate` - Calculate tax for order

---

## 13. Hardware Integration

### Printers
- `GET /hardware/printers` - List connected printers
- `POST /hardware/printers/{id}/test` - Test printer
- `POST /orders/{id}/print` - Print receipt/order ticket

### Cash Drawers
- `POST /hardware/cash-drawer/open` - Open cash drawer
- `GET /hardware/cash-drawer/status` - Get cash drawer status

### Scales
- `GET /hardware/scales` - List connected scales
- `GET /hardware/scales/{id}/weight` - Get current weight

---

## 14. Cash Management

### Cash Register
- `POST /cash-register/open` - Open cash register
- `POST /cash-register/close` - Close cash register
- `GET /cash-register/current` - Get current cash register session
- `POST /cash-register/add-cash` - Add cash (pay-in)
- `POST /cash-register/remove-cash` - Remove cash (pay-out)
- `GET /cash-register/history` - Cash register history

---

## 15. Delivery & Fulfillment (Adaptive)

### Delivery Orders
- `GET /delivery/orders` - List delivery orders
- `PUT /orders/{id}/delivery-info` - Add delivery information
- `PUT /delivery/orders/{id}/status` - Update delivery status
- `GET /delivery/drivers` - List delivery drivers
- `POST /delivery/orders/{id}/assign` - Assign driver to order

---

## Common Query Parameters

Most list endpoints support:
- `?page={number}` - Pagination
- `?limit={number}` - Items per page
- `?sort={field}` - Sort by field
- `?order=asc|desc` - Sort order
- `?from={date}` - Filter from date
- `?to={date}` - Filter to date
- `?location_id={id}` - Filter by location
- `?status={status}` - Filter by status

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Product not found",
    "details": { ... }
  }
}
```

---

## WebSocket Endpoints (Real-time Updates)

- `ws://api.yourpos.com/v1/ws/orders` - Real-time order updates
- `ws://api.yourpos.com/v1/ws/kitchen` - Kitchen display updates
- `ws://api.yourpos.com/v1/ws/inventory` - Inventory level updates