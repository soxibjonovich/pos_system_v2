import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { API_URL } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute } from '@tanstack/react-router'
import { Receipt, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

const ORDERS_API = `${API_URL}/api/admin/orders`
const USERS_API = `${API_URL}/api/admin/users`
const PRODUCTS_API = `${API_URL}/api/admin/products`

interface OrderItem {
  id: number
  product_id: number
  order_id: number
  quantity: number
  price: number
  subtotal: number
}

interface Order {
  id: number
  user_id: number
  total: number
  status: string
  notes: string | null
  created_at: string
  updated_at: string | null
  completed_at: string | null
  items: OrderItem[]
}

interface User {
  id: number
  username: string
  full_name: string
}

interface Product {
  id: number
  title: string
  description: string | null
  price: number
}

export const Route = createFileRoute('/admin/orders/')({
  component: () => (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { token } = useAuth()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(ORDERS_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`)
      }

      const data = await response.json()
      const ordersList = Array.isArray(data) ? data : (data.orders || [])
      
      setOrders(ordersList)
      setFilteredOrders(ordersList)
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(USERS_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()
      const usersList = Array.isArray(data) ? data : (data.users || [])
      setUsers(usersList)
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(PRODUCTS_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }

      const data = await response.json()
      const productsList = Array.isArray(data) ? data : (data.products || [])
      setProducts(productsList)
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  useEffect(() => {
    if (token) {
      fetchOrders()
      fetchUsers()
      fetchProducts()
    }
  }, [token])

  useEffect(() => {
    let filtered = [...orders]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((order) => {
        const orderId = order.id.toString()
        const notes = order.notes?.toLowerCase() || ''
        const user = users.find(u => u.id === order.user_id)
        const userName = user?.full_name.toLowerCase() || ''
        const username = user?.username.toLowerCase() || ''
        
        return orderId.includes(query) || 
               notes.includes(query) || 
               userName.includes(query) ||
               username.includes(query)
      })
    }

    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    if (userFilter) {
      filtered = filtered.filter((order) => order.user_id === parseInt(userFilter))
    }

    setFilteredOrders(filtered)
  }, [searchQuery, statusFilter, userFilter, orders, users])

  const handleOrderClick = async (order: Order) => {
    try {
      const response = await fetch(`${ORDERS_API}/${order.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch order details: ${response.statusText}`)
      }

      const detailedOrder = await response.json()
      setSelectedOrder(detailedOrder)
      setIsDetailModalOpen(true)
    } catch (err) {
      console.error('Error fetching order details:', err)
      alert(err instanceof Error ? err.message : 'Failed to fetch order details')
    }
  }

  const getUserName = (userId: number): string => {
    const user = users.find(u => u.id === userId)
    return user ? user.full_name : `User #${userId}`
  }

  const getProductName = (productId: number): string => {
    const product = products.find(p => p.id === productId)
    return product ? product.title : `Product #${productId}`
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const uniqueStatuses = Array.from(new Set(orders.map(o => o.status)))

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="size-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Orders</h1>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search orders by ID, user, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {uniqueStatuses.length > 0 && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}

        {users.length > 0 && (
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        )}

        {(searchQuery || statusFilter || userFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('')
              setUserFilter('')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {filteredOrders.length === 0
              ? 'No orders found'
              : `Showing ${filteredOrders.length} of ${orders.length} orders`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No orders match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow 
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOrderClick(order)}
                >
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>{getUserName(order.user_id)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell>{order.items?.length || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.completed_at ? formatDate(order.completed_at) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-blue-600" />
              Order Details - #{selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Complete information about this order
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                  <p className="text-lg font-semibold">#{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User</p>
                  <p className="text-sm">{getUserName(selectedOrder.user_id)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedOrder.total)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-sm">
                    {selectedOrder.completed_at ? formatDate(selectedOrder.completed_at) : 'Not completed'}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Order Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {getProductName(item.product_id)}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No items in this order
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}