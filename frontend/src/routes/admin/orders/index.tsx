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
import { API_URL } from "@/config"
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/i18n/i18nContext"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { createFileRoute } from "@tanstack/react-router"
import { Minus, Plus, Receipt, RefreshCw, Search, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

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
  subtotal_amount?: number
  fee_percent?: number
  fee_amount?: number
  qqs_percent?: number
  qqs_amount?: number
  status: string
  payment_method?: string | null
  order_type?: string | null
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

const ALL_STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"] as const
type StatusKey = (typeof ALL_STATUSES)[number]

export const Route = createFileRoute("/admin/orders/")({
  component: () => (
    <AuthGuard allowedRoles={["admin", "manager"]}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { token } = useAuth()
  const { t } = useI18n()

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")

  const [detailModal, setDetailModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [originalOrder, setOriginalOrder] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(ORDERS_API, { headers: authHeaders })
      if (!res.ok) throw new Error(`Failed: ${res.statusText}`)
      const data = await res.json()
      const list: Order[] = Array.isArray(data) ? data : data.orders || []
      setOrders(list)
      setFilteredOrders(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(USERS_API, { headers: authHeaders })
      if (!res.ok) return
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : data.users || [])
    } catch {
      /* silent */
    }
  }, [token])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(PRODUCTS_API, { headers: authHeaders })
      if (!res.ok) return
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : data.products || [])
    } catch {
      /* silent */
    }
  }, [token])

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
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((o) => {
        const user = users.find((u) => u.id === o.user_id)
        return (
          o.id.toString().includes(q) ||
          (o.notes?.toLowerCase() || "").includes(q) ||
          (user?.full_name.toLowerCase() || "").includes(q) ||
          (user?.username.toLowerCase() || "").includes(q)
        )
      })
    }
    if (statusFilter) filtered = filtered.filter((o) => o.status === statusFilter)
    if (userFilter) filtered = filtered.filter((o) => o.user_id === parseInt(userFilter))
    setFilteredOrders(filtered)
  }, [searchQuery, statusFilter, userFilter, orders, users])

  const fetchOrderDetail = async (orderId: number): Promise<Order | null> => {
    try {
      const res = await fetch(`${ORDERS_API}/${orderId}`, { headers: authHeaders })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  const viewOrder = async (order: Order) => {
    const detail = await fetchOrderDetail(order.id)
    if (detail) {
      setSelectedOrder(detail)
      setDetailModal(true)
    }
  }

  const openEdit = async (order: Order) => {
    const detail = await fetchOrderDetail(order.id)
    if (detail) {
      setOriginalOrder(detail)
      setEditingOrder(JSON.parse(JSON.stringify(detail)))
      setEditModal(true)
    }
  }

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`${ORDERS_API}/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed")
      await fetchOrders()
      setDetailModal(false)
      setEditModal(false)
    } catch {
      alert("Failed to update status")
    }
  }

  const updateItemQty = (itemId: number, delta: number) => {
    if (!editingOrder) return
    const updated = editingOrder.items
      .map((i) => {
        if (i.id !== itemId) return i
        const newQty = i.quantity + delta
        return newQty > 0 ? { ...i, quantity: newQty, subtotal: i.price * newQty } : null
      })
      .filter(Boolean) as OrderItem[]
    setEditingOrder({
      ...editingOrder,
      items: updated,
      total: updated.reduce((s, i) => s + i.subtotal, 0),
    })
  }

  const removeItem = async (itemId: number) => {
    if (!editingOrder) return
    try {
      const res = await fetch(`${ORDERS_API}/${editingOrder.id}/items/${itemId}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) throw new Error("Failed")
      const updated: Order = await res.json()
      setEditingOrder(updated)
      setOriginalOrder(updated)
      await fetchOrders()
    } catch {
      alert("Failed to remove item")
    }
  }

  const saveItemChanges = async () => {
    if (!editingOrder || !originalOrder) return
    setSaving(true)
    try {
      for (const item of editingOrder.items) {
        const orig = originalOrder.items.find((i) => i.id === item.id)
        if (orig && (orig.quantity !== item.quantity || orig.price !== item.price)) {
          const res = await fetch(`${ORDERS_API}/${editingOrder.id}/items/${item.id}`, {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify({ quantity: item.quantity, price: item.price }),
          })
          if (!res.ok) throw new Error("Failed to update item")
        }
      }
      if (originalOrder.status !== editingOrder.status) {
        await updateStatus(editingOrder.id, editingOrder.status)
        return
      }
      await fetchOrders()
      setEditModal(false)
    } catch {
      alert("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const deleteOrder = async (orderId: number) => {
    const order = orders.find((o) => o.id === orderId)
    const confirmMsg = t("adminOrders.deleteOrderConfirm").replace("{{id}}", String(orderId))
    if (!window.confirm(confirmMsg)) return
    try {
      const res = await fetch(`${ORDERS_API}/${orderId}`, {
        method: "DELETE",
        headers: authHeaders,
      })
      if (!res.ok) throw new Error("Failed")
      await fetchOrders()
      setDetailModal(false)
      setEditModal(false)
    } catch {
      alert("Failed to delete order")
    }
  }

  const getUserName = (userId: number) =>
    users.find((u) => u.id === userId)?.full_name || `User #${userId}`

  const getProductName = (productId: number) =>
    products.find((p) => p.id === productId)?.title || `Product #${productId}`

  const formatCurrency = (amount: number) =>
    `${Math.floor(amount).toLocaleString("uz-UZ")} so'm`

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed": return "bg-green-100 text-green-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "cancelled": return "bg-red-100 text-red-800"
      case "processing": return "bg-blue-100 text-blue-800"
      case "preparing": return "bg-blue-100 text-blue-800"
      case "ready": return "bg-violet-100 text-violet-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    const key = `adminOrders.status_${status.toLowerCase()}` as Parameters<typeof t>[0]
    const translated = t(key)
    return translated !== key ? translated : status
  }

  const getPaymentLabel = (method?: string | null) =>
    method === "card" ? `💳 ${t("adminOrders.card")}` : `💵 ${t("adminOrders.cash")}`

  const getOrderTypeLabel = (type?: string | null) => {
    if (type === "takeaway") return `🥡 ${t("adminOrders.takeaway")}`
    if (type === "delivery") return `🛵 ${t("adminOrders.delivery")}`
    return `🍽 ${t("adminOrders.dineIn")}`
  }

  const uniqueStatuses = Array.from(new Set(orders.map((o) => o.status)))
  const isEditable = (status: string) => !["completed", "cancelled"].includes(status)

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="size-5 animate-spin" />
          {t("adminOrders.loading")}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <p className="text-destructive">Error: {error}</p>
          <Button onClick={fetchOrders} variant="outline">
            <RefreshCw className="size-4 mr-2" />
            {t("adminOrders.refresh")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="size-6 text-blue-600" />
          <h1 className="text-2xl font-bold">{t("adminOrders.title")}</h1>
        </div>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="size-4 mr-2" />
          {t("adminOrders.refresh")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("adminOrders.search")}
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
            <option value="">{t("adminOrders.allStatuses")}</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
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
            <option value="">{t("adminOrders.allUsers")}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        )}
        {(searchQuery || statusFilter || userFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("")
              setStatusFilter("")
              setUserFilter("")
            }}
          >
            {t("adminOrders.clearFilters")}
          </Button>
        )}
      </div>

      {/* Status quick-filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            !statusFilter
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {t("adminOrders.allStatuses")} ({orders.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = orders.filter((o) => o.status === s).length
          if (!count) return null
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? getStatusColor(s) + " border-current"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {getStatusLabel(s)} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {filteredOrders.length === 0
              ? t("adminOrders.noOrders")
              : t("adminOrders.showing")
                  .replace("{{filtered}}", String(filteredOrders.length))
                  .replace("{{total}}", String(orders.length))}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t("adminOrders.orderId")}</TableHead>
              <TableHead>{t("adminOrders.user")}</TableHead>
              <TableHead>{t("adminOrders.total")}</TableHead>
              <TableHead>{t("adminOrders.status")}</TableHead>
              <TableHead>{t("adminOrders.items")}</TableHead>
              <TableHead>{t("adminOrders.created")}</TableHead>
              <TableHead className="text-right">{t("adminOrders.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {t("adminOrders.noMatch")}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>{getUserName(order.user_id)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell>{order.items?.length || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewOrder(order)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        {t("adminOrders.view")}
                      </Button>
                      {isEditable(order.status) && (
                        <Button
                          size="sm"
                          onClick={() => openEdit(order)}
                          className="bg-slate-700 hover:bg-slate-800 text-white"
                        >
                          {t("adminOrders.edit")}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteOrder(order.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail Modal ── */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-blue-600" />
              {t("adminOrders.orderDetails")} - #{selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>{t("adminOrders.orderDetailsDesc")}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/40 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.orderId")}</p>
                  <p className="text-lg font-semibold">#{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.status")}</p>
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.user")}</p>
                  <p className="text-sm font-semibold">{getUserName(selectedOrder.user_id)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.total")}</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedOrder.total)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.payment")}</p>
                  <p className="text-sm font-semibold">{getPaymentLabel(selectedOrder.payment_method)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.orderType")}</p>
                  <p className="text-sm font-semibold">{getOrderTypeLabel(selectedOrder.order_type)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.created")}</p>
                  <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("adminOrders.completed")}</p>
                  <p className="text-sm">
                    {selectedOrder.completed_at
                      ? formatDate(selectedOrder.completed_at)
                      : t("adminOrders.notCompleted")}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t("adminOrders.notes")}</p>
                  <p className="text-sm bg-muted p-2 rounded">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t("adminOrders.orderItems")}</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminOrders.product")}</TableHead>
                        <TableHead>{t("adminOrders.quantity")}</TableHead>
                        <TableHead>{t("adminOrders.price")}</TableHead>
                        <TableHead className="text-right">{t("adminOrders.subtotal")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{getProductName(item.product_id)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            {t("adminOrders.noItems")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Status actions */}
              {isEditable(selectedOrder.status) && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">{t("adminOrders.changeStatus")}:</p>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_STATUSES.filter((s) => s !== selectedOrder.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className={getStatusColor(s)}
                        onClick={() => updateStatus(selectedOrder.id, s)}
                      >
                        {getStatusLabel(s)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="pt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteOrder(selectedOrder.id)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4 mr-2" />
                  {t("adminOrders.deleteOrder")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {t("adminOrders.editOrder")} #{editingOrder?.id}
            </DialogTitle>
            <DialogDescription>{t("adminOrders.editOrderDesc")}</DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4">
              {/* Items list */}
              <div className="max-h-72 overflow-y-auto space-y-2 p-3 bg-muted/40 rounded-lg">
                {editingOrder.items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">{t("adminOrders.noItems")}</p>
                ) : (
                  editingOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{getProductName(item.product_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} × {item.quantity} ={" "}
                          <span className="text-green-600 font-medium">{formatCurrency(item.subtotal)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        <button
                          onClick={() => updateItemQty(item.id, -1)}
                          className="p-1.5 rounded border hover:bg-muted"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQty(item.id, 1)}
                          className="p-1.5 rounded border hover:bg-muted"
                        >
                          <Plus className="size-3.5" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded bg-red-50 border border-red-200 hover:bg-red-100 ml-1"
                        >
                          <X className="size-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-1">
                {(editingOrder.subtotal_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("adminOrders.subtotal")}</span>
                    <span>{formatCurrency(editingOrder.subtotal_amount || 0)}</span>
                  </div>
                )}
                {(editingOrder.fee_percent ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("adminOrders.serviceFee")} ({(editingOrder.fee_percent || 0).toFixed(1)}%)</span>
                    <span>{formatCurrency(editingOrder.fee_amount || 0)}</span>
                  </div>
                )}
                {(editingOrder.qqs_percent ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("adminOrders.tax")} ({(editingOrder.qqs_percent || 0).toFixed(1)}%)</span>
                    <span>{formatCurrency(editingOrder.qqs_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-1 border-t border-green-300">
                  <span>{t("adminOrders.total")}</span>
                  <span className="text-green-600">{formatCurrency(editingOrder.total)}</span>
                </div>
              </div>

              {/* Status selector */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("adminOrders.changeStatus")}:</p>
                <div className="flex gap-2 flex-wrap">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditingOrder({ ...editingOrder, status: s })}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        editingOrder.status === s
                          ? getStatusColor(s) + " border-current ring-2 ring-offset-1 ring-current"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {getStatusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteOrder(editingOrder.id)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4 mr-2" />
                  {t("adminOrders.deleteOrder")}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditModal(false)} disabled={saving}>
                    <X className="size-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={saveItemChanges} disabled={saving}>
                    {saving ? (
                      <>
                        <RefreshCw className="size-4 mr-2 animate-spin" />
                        {t("adminOrders.saving")}
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
