import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_URL, api } from "@/config";
import { useAuth } from "@/contexts/auth-context";
import { AuthGuard } from "@/middlewares/AuthGuard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  subtotal: number;
  product?: {
    title?: string;
  } | null;
}

interface Order {
  id: number;
  user_id: number;
  table_id: number | null;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  user?: {
    full_name?: string;
    username?: string;
  } | null;
  table?: {
    number?: string;
  } | null;
}

const ACTIVE_STATUSES = ["pending", "preparing", "ready"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  preparing: "bg-blue-100 text-blue-800 border border-blue-200",
  ready: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  completed: "bg-gray-100 text-gray-800 border border-gray-200",
  cancelled: "bg-rose-100 text-rose-800 border border-rose-200",
};

export const Route = createFileRoute("/chef/")({
  component: () => (
    <AuthGuard allowedRoles={["chef"]}>
      <ChefOrdersPage />
    </AuthGuard>
  ),
});

function ChefOrdersPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const token = localStorage.getItem("postoken");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}${api.orders.base}/${api.orders.orders}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to load orders");
      }

      const data = await res.json();
      const allOrders: Order[] = data.orders || [];
      const filtered = allOrders.filter((o) =>
        ACTIVE_STATUSES.includes(o.status),
      );
      setOrders(filtered);
    } catch {
      setError("Failed to load cooker orders");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let manuallyClosed = false;

    const wsUrl = (() => {
      const parsed = new URL(API_URL);
      const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${parsed.host}${api.orders.base}/ws`;
    })();

    const connect = () => {
      if (manuallyClosed) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "order_update") {
            fetchOrders();
          }
        } catch {
          // Ignore non-JSON websocket messages.
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!manuallyClosed) {
          reconnectTimerRef.current = window.setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      manuallyClosed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchOrders]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStaffName = (order: Order) =>
    order.user?.full_name || order.user?.username || `User #${order.user_id}`;

  const getItemTitle = (item: OrderItem) =>
    item.product?.title || `Product #${item.product_id}`;
  const getStatusClass = (status: string) =>
    STATUS_STYLES[status] || "bg-gray-100 text-gray-800 border border-gray-200";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="size-8 text-emerald-700" />
            <h1 className="text-3xl font-black text-slate-900">
              Cooker Orders
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchOrders}
              className="bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="size-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow className="hover:bg-slate-100 border-slate-200">
                <TableHead className="text-slate-700 font-semibold">
                  #
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  Table
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  Created By
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  Created At
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  Status
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-slate-500"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-rose-600"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-slate-500"
                  >
                    No active orders
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-slate-50 border-slate-200"
                  >
                    <TableCell className="font-bold text-slate-900">
                      #{order.id}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {order.table?.number || "-"}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {getStaffName(order)}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => openDetails(order)}
                        className="bg-slate-800 hover:bg-slate-700 text-white"
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[700px] bg-white text-slate-900 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              Order #{selectedOrder?.id}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Products, quantity, staff and time
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-sm border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-500">
                    Created by:{" "}
                  </span>
                  <span>{getStaffName(selectedOrder)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Time: </span>
                  <span>{formatDate(selectedOrder.created_at)}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Table: </span>
                  <span>{selectedOrder.table?.number || "-"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Status: </span>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusClass(selectedOrder.status)}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow className="hover:bg-slate-100 border-slate-200">
                      <TableHead className="text-slate-700 font-semibold">
                        Product
                      </TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">
                        Quantity
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50 border-slate-200"
                      >
                        <TableCell className="text-slate-800">
                          {getItemTitle(item)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
