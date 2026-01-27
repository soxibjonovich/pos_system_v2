import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from '@/config'
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Minus, Package, Plus, Receipt, RefreshCw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const UID = Number(localStorage.getItem("userId"))

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
  created_at: string
  updated_at: string | null
  items: OrderItem[]
}

interface Product {
  id: number
  title: string
  price: number
}

const STATUSES = [
  { value: 'pending', label: 'Kutilmoqda', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'preparing', label: 'Tayyorlanmoqda', color: 'bg-blue-100 text-blue-800' },
  { value: 'ready', label: 'Tayyor', color: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Yakunlangan', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Bekor qilingan', color: 'bg-red-100 text-red-800' },
]

export const Route = createFileRoute('/staff/orders/')({
  component: () => (
    <AuthGuard allowedRoles={['staff']}>
      <OrdersPage />
    </AuthGuard>
  ),
})

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [detailModal, setDetailModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${api.staff.base}/${api.staff.orders}/user/${UID}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.orders || [])
      setOrders(list)
      setFilteredOrders(list)
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${api.staff.base}/${api.staff.products}`)
      if (!res.ok) return
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : (data.products || []))
    } catch {}
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchProducts()
  }, [fetchOrders, fetchProducts])

  useEffect(() => {
    let filtered = [...orders]
    if (searchQuery.trim()) {
      filtered = filtered.filter(o => o.id.toString().includes(searchQuery.toLowerCase()))
    }
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter)
    }
    setFilteredOrders(filtered)
  }, [searchQuery, statusFilter, orders])

  const viewOrder = async (order: Order) => {
    try {
      const res = await fetch(`${api.staff.base}/${api.staff.orders}/${order.id}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSelectedOrder(data)
      setDetailModal(true)
    } catch {
      alert('Failed to load order details')
    }
  }

  const openEdit = (order: Order) => {
    setEditingOrder({ ...order })
    setEditModal(true)
  }

  const updateStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`${api.staff.base}/${api.staff.orders}/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed')
      await fetchOrders()
      setDetailModal(false)
      setEditModal(false)
    } catch {
      alert('Failed to update status')
    }
  }

  const updateItemQty = (itemId: number, delta: number) => {
    if (!editingOrder) return
    const updated = editingOrder.items.map(i => {
      if (i.id === itemId) {
        const newQty = i.quantity + delta
        return newQty > 0 ? { ...i, quantity: newQty, subtotal: i.price * newQty } : null
      }
      return i
    }).filter(Boolean) as OrderItem[]
    
    setEditingOrder({
      ...editingOrder,
      items: updated,
      total: updated.reduce((s, i) => s + i.subtotal, 0)
    })
  }

  const removeItem = async (itemId: number) => {
    if (!editingOrder) return
    try {
      const res = await fetch(`${api.staff.base}/${api.staff.orders}/${editingOrder.id}/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      const updated = await res.json()
      setEditingOrder(updated)
      await fetchOrders()
    } catch {
      alert('Failed to remove item')
    }
  }

  const saveChanges = async () => {
    if (!editingOrder) return
    try {
      for (const item of editingOrder.items) {
        await fetch(`${api.staff.base}/${api.staff.orders}/${editingOrder.id}/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: item.quantity, price: item.price })
        })
      }
      if (editingOrder.status) {
        await fetch(`${api.staff.base}/${api.staff.orders}/${editingOrder.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: editingOrder.status })
        })
      }
      await fetchOrders()
      setEditModal(false)
    } catch {
      alert('Failed to save')
    }
  }

  const getProductName = (id: number) => products.find(p => p.id === id)?.title || `#${id}`
  const formatPrice = (n: number) => `${Math.floor(n).toLocaleString('uz-UZ')} so'm`
  const formatDate = (d: string) => new Date(d).toLocaleString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const getStatusColor = (s: string) => STATUSES.find(st => st.value === s.toLowerCase())?.color || 'bg-gray-100 text-gray-800'
  const getStatusText = (s: string) => STATUSES.find(st => st.value === s.toLowerCase())?.label || s

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl font-semibold">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-center">
          <Package className="size-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-red-600">{error}</p>
          <Button onClick={fetchOrders} className="mt-4">
            <RefreshCw className="size-4 mr-2" />
            Qayta yuklash
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link to="/staff">
                <Button variant="outline" size="lg" className="flex items-center gap-2">
                  <ArrowLeft className="size-5" />
                  POS Terminal
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Receipt className="size-8 text-blue-600" />
                <h1 className="text-3xl font-black">Buyurtmalarim</h1>
              </div>
            </div>
            <Button onClick={fetchOrders} variant="outline" size="lg">
              <RefreshCw className="size-5 mr-2" />
              Yangilash
            </Button>
          </div>
    
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <Input type="text" placeholder="Buyurtma #..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-12 text-lg" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-12 rounded-md border px-4 text-base">
              <option value="">Barcha holatlar</option>
              {Array.from(new Set(orders.map(o => o.status))).map(s => (
                <option key={s} value={s}>{getStatusText(s)}</option>
              ))}
            </select>
            {(searchQuery || statusFilter) && (
              <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('') }} className="h-12">
                Tozalash
              </Button>
            )}
          </div>
    
          <div className="border rounded-lg shadow-lg overflow-hidden bg-white">
            <Table>
              <TableCaption className="py-4">
                {!filteredOrders.length ? 'Buyurtmalar topilmadi' : `${filteredOrders.length} / ${orders.length} ta`}
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">#</TableHead>
                  <TableHead className="font-bold">Summa</TableHead>
                  <TableHead className="font-bold">Holat</TableHead>
                  <TableHead className="font-bold">Mahsulotlar</TableHead>
                  <TableHead className="font-bold">Vaqt</TableHead>
                  <TableHead className="text-right font-bold">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!filteredOrders.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                      <Package className="size-16 mx-auto mb-4 opacity-30" />
                      Buyurtmalar yo'q
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map(o => (
                    <TableRow key={o.id} className="hover:bg-gray-50">
                      <TableCell className="font-bold text-lg">#{o.id}</TableCell>
                      <TableCell className="font-bold text-green-600 text-lg">{formatPrice(o.total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(o.status)}`}>
                          {getStatusText(o.status)}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{o.items?.length || 0} ta</TableCell>
                      <TableCell className="text-sm">{formatDate(o.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => viewOrder(o)}>Ko'rish</Button>
                        {o.status !== 'completed' && o.status !== 'cancelled' && (
                          <Button size="sm" onClick={() => openEdit(o)}>Tahrirlash</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
    
          <Dialog open={detailModal} onOpenChange={setDetailModal}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Receipt className="size-6 text-blue-600" />
                  Buyurtma #{selectedOrder?.id}
                </DialogTitle>
                <DialogDescription>Tafsilotlar</DialogDescription>
              </DialogHeader>
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Raqam</p>
                      <p className="text-xl font-bold">#{selectedOrder.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Holat</p>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Jami</p>
                      <p className="text-3xl font-black text-green-600">{formatPrice(selectedOrder.total)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Yaratildi</p>
                      <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Yangilandi</p>
                      <p className="text-sm">{selectedOrder.updated_at ? formatDate(selectedOrder.updated_at) : '-'}</p>
                    </div>
                  </div>
    
                  <div>
                    <p className="font-bold mb-3">Mahsulotlar</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nomi</TableHead>
                          <TableHead>Miqdor</TableHead>
                          <TableHead>Narx</TableHead>
                          <TableHead className="text-right">Jami</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items?.map(i => (
                          <TableRow key={i.id}>
                            <TableCell className="font-medium">{getProductName(i.product_id)}</TableCell>
                            <TableCell>{i.quantity} ta</TableCell>
                            <TableCell>{formatPrice(i.price)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{formatPrice(i.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
    
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <div className="flex gap-2 flex-wrap pt-4 border-t">
                      <p className="w-full text-sm font-semibold mb-2">Holatni o'zgartirish:</p>
                      {STATUSES.filter(s => s.value !== selectedOrder.status).map(s => (
                        <Button key={s.value} variant="outline" size="sm" onClick={() => updateStatus(selectedOrder.id, s.value)}>
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
    
          <Dialog open={editModal} onOpenChange={setEditModal}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle className="text-2xl">Tahrirlash #{editingOrder?.id}</DialogTitle>
                <DialogDescription>Mahsulotlar va holatni o'zgartiring</DialogDescription>
              </DialogHeader>
              {editingOrder && (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                    {editingOrder.items.map(i => (
                      <div key={i.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
                        <div className="flex-1">
                          <p className="font-bold text-lg">{getProductName(i.product_id)}</p>
                          <p className="text-sm text-gray-600">{formatPrice(i.price)} × {i.quantity}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="icon" onClick={() => updateItemQty(i.id, -1)}>
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-16 text-center font-black text-xl">{i.quantity}</span>
                          <Button variant="outline" size="icon" onClick={() => updateItemQty(i.id, 1)}>
                            <Plus className="size-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => removeItem(i.id)}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
    
                  <div className="flex justify-between items-center text-2xl font-black p-4 bg-green-50 rounded-lg">
                    <span>Jami:</span>
                    <span className="text-green-600">{formatPrice(editingOrder.total)}</span>
                  </div>
    
                  <div className="space-y-3">
                    <p className="font-bold">Holat:</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUSES.map(s => (
                        <Button
                          key={s.value}
                          variant={editingOrder.status === s.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditingOrder({ ...editingOrder, status: s.value })}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </div>
    
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setEditModal(false)}>Bekor qilish</Button>
                    <Button onClick={saveChanges}>
                      <Check className="size-4 mr-2" />
                      Saqlash
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )
    }
