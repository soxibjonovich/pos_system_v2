import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, API_URL } from "@/config";
import { AuthGuard } from "@/middlewares/AuthGuard";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Minus,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface OrderItem {
  id: number;
  product_id: number;
  order_id: number;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: number;
  user_id: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string | null;
  items: OrderItem[];
}

interface Product {
  id: number;
  title: string;
  price: number;
}

const STATUSES = {
  pending: {
    label: "Kutilmoqda",
    bg: "#fef9c3",
    text: "#854d0e",
    border: "#eab308",
  },
  preparing: {
    label: "Tayyorlanmoqda",
    bg: "#dbeafe",
    text: "#1e40af",
    border: "#3b82f6",
  },
  ready: { label: "Tayyor", bg: "#f3e8ff", text: "#6b21a8", border: "#a855f7" },
  completed: {
    label: "Yakunlangan",
    bg: "#dcfce7",
    text: "#166534",
    border: "#22c55e",
  },
  cancelled: {
    label: "Bekor qilingan",
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#ef4444",
  },
} as const;

type StatusKey = keyof typeof STATUSES;

const ORDERS_URL = `${api.staff.base}/${api.staff.orders}`;
const PRODUCTS_URL = `${api.staff.base}/${api.staff.products}`;
const TOKEN = localStorage.getItem("postoken");
const UID = Number(localStorage.getItem("userId"));

export const Route = createFileRoute("/staff/orders/")({
  component: () => (
    <AuthGuard allowedRoles={["staff"]}>
      <OrdersPage />
    </AuthGuard>
  ),
});

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status as StatusKey] || {
    label: status,
    bg: "#f3f4f6",
    text: "#374151",
    border: "#9ca3af",
  };
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
      className="inline-flex px-3 py-1 rounded-full text-xs font-bold"
    >
      {s.label}
    </span>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailModal, setDetailModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [originalOrder, setOriginalOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /orders/user/{user_id} -> { orders[], total }
      const res = await fetch(`${ORDERS_URL}/user/${UID}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOrders(data.orders || []);
      setFilteredOrders(data.orders || []);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      // GET /products -> { products[], total }
      const res = await fetch(PRODUCTS_URL);
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      // Keep products list empty if request fails.
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  useEffect(() => {
    let filtered = [...orders];
    if (searchQuery.trim()) {
      filtered = filtered.filter((o) => o.id.toString().includes(searchQuery));
    }
    if (statusFilter) {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  // GET /orders/{order_id} -> OrderResponse
  const fetchOrderDetail = async (orderId: number): Promise<Order | null> => {
    try {
      const res = await fetch(
        `${API_URL}${api.orders.base}/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${TOKEN}` },
        },
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const viewOrder = async (order: Order) => {
    const detail = await fetchOrderDetail(order.id);
    if (detail) {
      setSelectedOrder(detail);
      setDetailModal(true);
    } else {
      alert("Failed to load order details");
    }
  };

  const openEdit = async (order: Order) => {
    const detail = await fetchOrderDetail(order.id);
    if (detail) {
      setOriginalOrder(detail);
      setEditingOrder(JSON.parse(JSON.stringify(detail)));
      setEditModal(true);
    } else {
      alert("Failed to load order");
    }
  };

  // PATCH /orders/{order_id}/status -> body: { status: enum }
  const updateStatus = async (orderId: number, newStatus: string) => {
    const currentOrder = orders.find((o) => o.id === orderId);
    if (newStatus !== "completed" && newStatus !== "cancelled") {
      alert("Faqat 'completed' yoki 'cancelled' holatiga o'tkazish mumkin");
      return;
    }

    if (newStatus === "completed" && currentOrder?.status !== "ready") {
      alert("Faqat 'ready' holatidagi buyurtmani yakunlash mumkin");
      return;
    }
    if (!currentOrder) {
      alert("Buyurtma topilmadi");
      return;
    }
    if (
      currentOrder.status === "completed" ||
      currentOrder.status === "cancelled"
    ) {
      alert(
        "Yakunlangan yoki bekor qilingan buyurtma holatini o'zgartirib bo'lmaydi",
      );
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}${api.orders.base}/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!res.ok) throw new Error("Failed");
      await fetchOrders();
      setDetailModal(false);
      setEditModal(false);
    } catch {
      alert("Failed to update status");
    }
  };

  const updateItemQty = (itemId: number, delta: number) => {
    if (!editingOrder) return;
    const updated = editingOrder.items
      .map((i) => {
        if (i.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0
            ? { ...i, quantity: newQty, subtotal: i.price * newQty }
            : null;
        }
        return i;
      })
      .filter(Boolean) as OrderItem[];

    setEditingOrder({
      ...editingOrder,
      items: updated,
      total: updated.reduce((s, i) => s + i.subtotal, 0),
    });
  };

  // DELETE /orders/{order_id}/items/{item_id} -> OrderResponse
  const removeItem = async (itemId: number) => {
    if (!editingOrder) return;
    try {
      const res = await fetch(
        `${API_URL}${api.orders.base}/orders/${editingOrder.id}/items/${itemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${TOKEN}` },
        },
      );
      if (!res.ok) throw new Error("Failed");
      const updated: Order = await res.json();
      setEditingOrder(updated);
      setOriginalOrder(updated);
      await fetchOrders();
    } catch {
      alert("Failed to remove item");
    }
  };

  // PUT /orders/{order_id}/items/{item_id} -> body: { quantity?, price? }
  const saveItemChanges = async () => {
    if (!editingOrder || !originalOrder) return;
    setSaving(true);
    try {
      for (const item of editingOrder.items) {
        const orig = originalOrder.items.find((i) => i.id === item.id);
        if (
          orig &&
          (orig.quantity !== item.quantity || orig.price !== item.price)
        ) {
          const res = await fetch(
            `${API_URL}${api.orders.base}/orders/${editingOrder.id}/items/${item.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${TOKEN}`,
              },
              body: JSON.stringify({
                quantity: item.quantity,
                price: item.price,
              }),
            },
          );
          if (!res.ok) throw new Error("Failed to update item");
        }
      }

      // PATCH /orders/{order_id}/ if status changed
      if (originalOrder.status !== editingOrder.status) {
        const res = await fetch(
          `${API_URL}${api.orders.base}/orders/${editingOrder.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify({ status: editingOrder.status }),
          },
        );
        if (!res.ok) throw new Error("Failed to update status");
      }

      await fetchOrders();
      setEditModal(false);
    } catch {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const getProductName = (id: number) =>
    products.find((p) => p.id === id)?.title || `#${id}`;
  const formatPrice = (n: number) =>
    `${Math.floor(n).toLocaleString("uz-UZ")} so'm`;
  const formatDate = (d: string) =>
    new Date(d).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="size-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Package className="size-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-red-600 mb-4">{error}</p>
          <Button onClick={fetchOrders}>
            <RefreshCw className="size-4 mr-2" />
            Qayta yuklash
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/staff">
              <Button
                variant="outline"
                size="lg"
                className="flex items-center gap-2 text-black"
              >
                <ArrowLeft className="size-5" />
                POS Terminal
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Receipt className="size-8 text-blue-600" />
              <h1 className="text-3xl font-black text-gray-900">
                Buyurtmalarim
              </h1>
            </div>
          </div>
          <Button
            onClick={fetchOrders}
            variant="outline"
            size="lg"
            className="text-black"
          >
            <RefreshCw className="size-5 mr-2 text-black" />
            Yangilash
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buyurtma #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg text-black"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-md border px-4 text-base bg-white text-gray-900"
          >
            <option value="">Barcha holatlar</option>
            {Object.entries(STATUSES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          {(searchQuery || statusFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
              }}
              className="h-12"
            >
              Tozalash
            </Button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${!statusFilter ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"}`}
          >
            Hammasi ({orders.length})
          </button>
          {Object.entries(STATUSES).map(([key, val]) => {
            const count = orders.filter((o) => o.status === key).length;
            if (!count) return null;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                style={{
                  backgroundColor: statusFilter === key ? val.bg : "white",
                  color: statusFilter === key ? val.text : "#374151",
                  border: `2px solid ${statusFilter === key ? val.border : "#e5e7eb"}`,
                }}
                className="px-4 py-2 rounded-full text-sm font-bold transition-all"
              >
                {val.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="border rounded-lg shadow-lg overflow-hidden bg-white">
          <Table>
            <TableCaption className="py-4 text-gray-600">
              {!filteredOrders.length
                ? "Buyurtmalar topilmadi"
                : `${filteredOrders.length} / ${orders.length} ta`}
            </TableCaption>
            <TableHeader>
              <TableRow style={{ backgroundColor: "#f9fafb" }}>
                <TableHead className="font-bold text-gray-900">#</TableHead>
                <TableHead className="font-bold text-gray-900">Summa</TableHead>
                <TableHead className="font-bold text-gray-900">Holat</TableHead>
                <TableHead className="font-bold text-gray-900">
                  Mahsulotlar
                </TableHead>
                <TableHead className="font-bold text-gray-900">Vaqt</TableHead>
                <TableHead className="text-right font-bold text-gray-900">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredOrders.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <Package className="size-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg font-semibold">
                      Buyurtmalar yo'q
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Hali hech qanday buyurtma berilmagan
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((o) => (
                  <TableRow key={o.id} className="hover:bg-gray-50">
                    <TableCell className="font-bold text-lg text-gray-900">
                      #{o.id}
                    </TableCell>
                    <TableCell className="font-bold text-green-600 text-lg">
                      {formatPrice(o.total)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="font-semibold text-gray-700">
                      {o.items?.length || 0} ta
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(o.created_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewOrder(o)}
                      >
                        Ko'rish
                      </Button>
                      {o.status === "ready" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateStatus(o.id, "completed")}
                        >
                          To'landi
                        </Button>
                      )}
                      {o.status !== "completed" && o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => openEdit(o)}>
                          Tahrirlash
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Detail Modal */}
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
                    <p className="text-xl font-bold text-gray-900">
                      #{selectedOrder.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Holat</p>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Jami</p>
                    <p className="text-3xl font-black text-green-600">
                      {formatPrice(selectedOrder.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Yaratildi
                    </p>
                    <p className="text-sm text-gray-700">
                      {formatDate(selectedOrder.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Yangilandi
                    </p>
                    <p className="text-sm text-gray-700">
                      {selectedOrder.updated_at
                        ? formatDate(selectedOrder.updated_at)
                        : "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-bold mb-3 text-gray-900">Mahsulotlar</p>
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
                      {selectedOrder.items?.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-gray-900">
                            {getProductName(i.product_id)}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {i.quantity} ta
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {formatPrice(i.price)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatPrice(i.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedOrder.status !== "completed" &&
                  selectedOrder.status !== "cancelled" && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold mb-3 text-gray-700">
                        Holatni o'zgartirish:
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {selectedOrder.status === "ready" ? (
                          <Button
                            onClick={() =>
                              updateStatus(selectedOrder.id, "completed")
                            }
                          >
                            To'lov qilindi (Yakunlash)
                          </Button>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Buyurtma faqat `ready` holatida yakunlanadi.
                          </p>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() =>
                            updateStatus(selectedOrder.id, "cancelled")
                          }
                        >
                          Bekor qilish
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModal} onOpenChange={setEditModal}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Tahrirlash #{editingOrder?.id}
              </DialogTitle>
              <DialogDescription>
                Mahsulotlar va holatni o'zgartiring
              </DialogDescription>
            </DialogHeader>
            {editingOrder && (
              <div className="space-y-4">
                <div className="max-h-80 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                  {!editingOrder.items.length ? (
                    <p className="text-center text-gray-500 py-6">
                      Mahsulotlar yo'q
                    </p>
                  ) : (
                    editingOrder.items.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">
                            {getProductName(i.product_id)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(i.price)} × {i.quantity} ={" "}
                            <span className="text-green-600 font-semibold">
                              {formatPrice(i.subtotal)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQty(i.id, -1)}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 active:scale-95"
                          >
                            <Minus className="size-4 text-gray-700" />
                          </button>
                          <span className="w-10 text-center font-black text-lg text-gray-900">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() => updateItemQty(i.id, 1)}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 active:scale-95"
                          >
                            <Plus className="size-4 text-gray-700" />
                          </button>
                          <button
                            onClick={() => removeItem(i.id)}
                            className="p-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 ml-2"
                          >
                            <X className="size-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between items-center text-2xl font-black p-4 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-gray-900">Jami:</span>
                  <span className="text-green-600">
                    {formatPrice(editingOrder.total)}
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="font-bold text-gray-900">Holat:</p>
                  <div className="flex gap-2 flex-wrap">
                    {editingOrder.status === "ready" ? (
                      <Button
                        onClick={() =>
                          setEditingOrder({
                            ...editingOrder,
                            status: "completed",
                          })
                        }
                      >
                        To'lov qilindi (Yakunlash)
                      </Button>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Holatni o'zgartirish uchun buyurtma `ready` bo'lishi
                        kerak.
                      </p>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() =>
                        setEditingOrder({
                          ...editingOrder,
                          status: "cancelled",
                        })
                      }
                    >
                      Bekor qilish
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setEditModal(false)}
                    disabled={saving}
                  >
                    Bekor qilish
                  </Button>
                  <Button onClick={saveItemChanges} disabled={saving}>
                    {saving ? (
                      <RefreshCw className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="size-4 mr-2" />
                    )}
                    Saqlash
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
