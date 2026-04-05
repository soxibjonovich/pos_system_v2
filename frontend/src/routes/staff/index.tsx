import { api, API_URL } from "@/config";
import { useAuth } from "@/contexts/auth-context";
import { useBusiness } from "@/contexts/business-context";
import { AuthGuard } from "@/middlewares/AuthGuard";
import { printService } from "@/utils/printService";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
    Check,
    Grid3x3,
    List,
    LogOut,
    Minus,
    Plus,
    Printer,
    Receipt,
    Search,
    ShoppingCart,
    Trash2,
    Users,
    UtensilsCrossed,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Product {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  quantity: number;
  price: number;
  is_active: boolean;
  image_url?: string;
  image_filename?: string;
}

interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

interface TableItem {
  id: number;
  number: string;
  location?: string | null;
  capacity: number | null;
  is_active: boolean;
  status: "available" | "occupied" | "reserved" | string;
}

interface CartItem {
  product_id: number;
  title: string;
  price: number;
  quantity: number;
}

interface ActiveTableOrder {
  order_id: number;
  table_id: number;
  status: string;
  created_at: string;
  user_name: string;
  total: number;
}

interface ExistingOrderItemRef {
  item_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

const formatPrice = (price: number) =>
  `${Math.floor(price).toLocaleString("uz-UZ")} so'm`;

const TABLES_PER_PAGE = 10;

const normalize = (value: string) => value.trim().toLowerCase();

const resolveProductImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return `${API_URL}${imageUrl}`;
};

export const Route = createFileRoute("/staff/")({
  component: () => (
    <AuthGuard allowedRoles={["staff"]}>
      <POSTerminal />
    </AuthGuard>
  ),
});

export default function POSTerminal() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isRestaurant, isLoading: businessLoading } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<number, boolean>>(
    {},
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tableOrdersByTable, setTableOrdersByTable] = useState<
    Record<number, ActiveTableOrder>
  >({});
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [baseOrderItems, setBaseOrderItems] = useState<ExistingOrderItemRef[]>(
    [],
  );
  const [tableOrderLoading, setTableOrderLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [defaultFeePercent, setDefaultFeePercent] = useState(0);
  const [feePercent, setFeePercent] = useState(0);
  const [baseFeePercent, setBaseFeePercent] = useState(0);
  const [defaultQqsPercent, setDefaultQqsPercent] = useState(0);
  const [qqsPercent, setQqsPercent] = useState(0);
  const [baseQqsPercent, setBaseQqsPercent] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [tablesPage, setTablesPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [showTableSelect, setShowTableSelect] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [basePaymentMethod, setBasePaymentMethod] = useState<"cash" | "card">(
    "cash",
  );
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [baseOrderType, setBaseOrderType] = useState<
    "dine_in" | "takeaway" | "delivery"
  >("dine_in");

  // Print status
  const [printerStatus, setPrinterStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [printNotification] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const CURRENT_USER_ID = Number(localStorage.getItem("userId"));
  const CURRENT_USER_NAME = localStorage.getItem("userName") || "Staff";

  useEffect(() => {
    if (!businessLoading) {
      fetchData();
      checkPrinterStatus();
    }
  }, [businessLoading]);

  const checkPrinterStatus = async () => {
    const isAvailable = await printService.checkAgentStatus();
    setPrinterStatus(isAvailable ? "connected" : "disconnected");
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const requests = [
        fetch(`${api.staff.base}/${api.staff.products}`),
        fetch(`${api.staff.base}/${api.staff.categories}`),
      ];

      if (isRestaurant) {
        requests.push(fetch(`${api.staff.base}/${api.staff.tables}`));
      }

      const responses = await Promise.all(requests);
      const [productsData, categoriesData, tablesData] = await Promise.all(
        responses.map((r) => r.json()),
      );

      try {
        const configRes = await fetch(
          `${API_URL}${api.orders.base}/${api.orders.config}`,
        );
        if (configRes.ok) {
          const configData = await configRes.json();
          const configuredFee = Number(configData?.service_fee_percent || 0);
          const configuredQqs = Number(configData?.qqs_percent || 0);
          setDefaultFeePercent(configuredFee);
          setDefaultQqsPercent(configuredQqs);
          if (!activeOrderId) {
            setFeePercent(configuredFee);
            setBaseFeePercent(configuredFee);
            setQqsPercent(configuredQqs);
            setBaseQqsPercent(configuredQqs);
          }
        }
      } catch (configErr) {
        console.error("Failed to load order config:", configErr);
      }

      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
      if (isRestaurant) {
        setTables(tablesData.tables || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRestaurantTableActivity = useCallback(async () => {
    if (!isRestaurant) return;
    try {
      const res = await fetch(
        `${API_URL}${api.orders.base}/${api.orders.orders}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("postoken") || ""}`,
          },
        },
      );
      if (!res.ok) return;

      const data = await res.json();
      const orders = Array.isArray(data.orders) ? data.orders : [];
      const activeOrders = orders.filter(
        (order: any) =>
          order?.table_id &&
          ["pending", "preparing", "ready"].includes(
            String(order?.status || ""),
          ),
      );

      const mapped: Record<number, ActiveTableOrder> = {};
      for (const order of activeOrders) {
        const tableId = Number(order.table_id);
        if (!tableId || mapped[tableId]) continue;
        mapped[tableId] = {
          order_id: Number(order.id),
          table_id: tableId,
          status: String(order.status || ""),
          created_at: String(order.created_at || ""),
          total: Number(order.total || 0),
          user_name:
            order?.user?.full_name || order?.user?.username || "Xodim noma'lum",
        };
      }

      const fallbackTables = tables.filter(
        (table) =>
          table.is_active &&
          (table.status === "occupied" || table.status === "reserved") &&
          !mapped[table.id],
      );

      await Promise.all(
        fallbackTables.map(async (table) => {
          try {
            const tableRes = await fetch(
              `${api.staff.base}/${api.staff.orders}/table/${table.id}`,
            );
            if (!tableRes.ok) return;
            const tableData = await tableRes.json();
            const tableOrders = Array.isArray(tableData?.orders)
              ? tableData.orders
              : [];
            const order = tableOrders[0];
            if (!order) return;

            mapped[table.id] = {
              order_id: Number(order.id),
              table_id: Number(order.table_id),
              status: String(order.status || ""),
              created_at: String(order.created_at || ""),
              total: Number(order.total || 0),
              user_name:
                order?.user?.full_name ||
                order?.user?.username ||
                "Xodim noma'lum",
            };
          } catch {
            // ignore single table lookup error
          }
        }),
      );

      setTableOrdersByTable(mapped);
    } catch {
      // keep UI responsive when order service is unavailable
    }
  }, [isRestaurant, tables]);

  useEffect(() => {
    if (businessLoading || !isRestaurant) return;
    fetchRestaurantTableActivity();
    const timer = setInterval(fetchRestaurantTableActivity, 10000);
    return () => clearInterval(timer);
  }, [businessLoading, isRestaurant, fetchRestaurantTableActivity]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory !== null && p.category_id === selectedCategory;
    const isActive = p.is_active;
    return matchesSearch && matchesCategory && isActive;
  });

  const availableTables = tables.filter((t) => t.is_active);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          title: product.title,
          price: product.price,
          quantity,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product_id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedTable(null);
    setActiveOrderId(null);
    setBaseOrderItems([]);
    setFeePercent(defaultFeePercent);
    setBaseFeePercent(defaultFeePercent);
    setQqsPercent(defaultQqsPercent);
    setBaseQqsPercent(defaultQqsPercent);
    setPaymentMethod("cash");
    setBasePaymentMethod("cash");
    setOrderType("dine_in");
    setBaseOrderType("dine_in");
  }, [defaultFeePercent, defaultQqsPercent]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const qqsAmount = Math.round(subtotal * qqsPercent) / 100;
  const effectiveFeePercent =
    orderType === "takeaway" || orderType === "delivery" ? 0 : feePercent;
  const feeAmount = Math.round(subtotal * effectiveFeePercent) / 100;
  const total = subtotal + qqsAmount + feeAmount;
  const serviceFeeDisabled =
    orderType === "takeaway" || orderType === "delivery";
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const baseQtyByProduct = baseOrderItems.reduce<Record<number, number>>(
    (acc, item) => {
      acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity;
      return acc;
    },
    {},
  );

  const handleCheckout = () => {
    if (!cart.length) return;
    if (isRestaurant) {
      if (selectedTable) {
        submitOrder();
        return;
      }
      setShowTableSelect(true);
    } else {
      submitOrder();
    }
  };

  const handleLogout = () => {
    if (cart.length > 0) {
      setShowLogoutConfirm(true);
    } else {
      logout();
      navigate({ to: "/login" });
    }
  };

  const confirmLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const completeSelectedTableOrder = async () => {
    const currentOrderId = selectedTableOrder?.order_id || activeOrderId;
    if (!currentOrderId) {
      alert("Yakunlash uchun faol buyurtma topilmadi");
      return;
    }

    if (
      selectedTableOrder &&
      !["pending", "ready"].includes(selectedTableOrder.status)
    ) {
      alert(
        "Buyurtmani yakunlash uchun holat `pending` yoki `ready` bo'lishi kerak",
      );
      return;
    }

    setIsCompletingOrder(true);
    try {
      const token = localStorage.getItem("postoken") || "";
      const res = await fetch(
        `${API_URL}${api.orders.base}/${api.orders.orders}/${currentOrderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "completed" }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(String(errorData?.detail || "Yakunlashda xatolik"));
      }

      setCart([]);
      setBaseOrderItems([]);
      setActiveOrderId(null);
      await fetchRestaurantTableActivity();
      await fetchData();
    } catch (err) {
      alert(
        `Buyurtmani yakunlab bo'lmadi: ${err instanceof Error ? err.message : "Xatolik"}`,
      );
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const loadExistingOrderForTable = useCallback(
    async (orderId: number) => {
      setTableOrderLoading(true);
      try {
        const token = localStorage.getItem("postoken") || "";
        const res = await fetch(
          `${API_URL}${api.orders.base}/${api.orders.orders}/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!res.ok) {
          setCart([]);
          setBaseOrderItems([]);
          setActiveOrderId(orderId);
          return;
        }

        const order = await res.json();
        const items = Array.isArray(order?.items) ? order.items : [];
        const currentFeePercent = Number(order?.fee_percent || 0);
        const currentQqsPercent = Number(order?.qqs_percent || 0);

        setBaseOrderItems(
          items.map((item: any) => ({
            item_id: Number(item.id),
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
            price: Number(item.price),
          })),
        );
        const merged = new Map<
          number,
          { product_id: number; title: string; price: number; quantity: number }
        >();
        for (const item of items) {
          const productId = Number(item.product_id);
          const qty = Number(item.quantity);
          const price = Number(item.price);
          const title =
            item?.product?.title ||
            products.find((p) => p.id === productId)?.title ||
            `#${productId}`;
          if (merged.has(productId)) {
            const prev = merged.get(productId)!;
            merged.set(productId, { ...prev, quantity: prev.quantity + qty });
          } else {
            merged.set(productId, {
              product_id: productId,
              title,
              price,
              quantity: qty,
            });
          }
        }
        setCart(Array.from(merged.values()));
        setFeePercent(currentFeePercent);
        setBaseFeePercent(currentFeePercent);
        setQqsPercent(currentQqsPercent);
        setBaseQqsPercent(currentQqsPercent);
        const nextPaymentMethod =
          order?.payment_method === "card" ? "card" : "cash";
        const nextOrderType =
          order?.order_type === "takeaway" || order?.order_type === "delivery"
            ? order.order_type
            : "dine_in";
        setPaymentMethod(nextPaymentMethod);
        setBasePaymentMethod(nextPaymentMethod);
        setOrderType(nextOrderType);
        setBaseOrderType(nextOrderType);
        setActiveOrderId(orderId);
      } catch {
        setCart([]);
        setBaseOrderItems([]);
        setFeePercent(defaultFeePercent);
        setBaseFeePercent(defaultFeePercent);
        setQqsPercent(defaultQqsPercent);
        setBaseQqsPercent(defaultQqsPercent);
        setPaymentMethod("cash");
        setBasePaymentMethod("cash");
        setOrderType("dine_in");
        setBaseOrderType("dine_in");
        setActiveOrderId(orderId);
      } finally {
        setTableOrderLoading(false);
      }
    },
    [products, defaultFeePercent, defaultQqsPercent],
  );

  const handleSelectTable = useCallback(
    async (table: TableItem) => {
      setSelectedTable(table);
      const tableOrder = tableOrdersByTable[table.id];
      if (tableOrder?.order_id) {
        await loadExistingOrderForTable(tableOrder.order_id);
      } else {
        setCart([]);
        setBaseOrderItems([]);
        setFeePercent(defaultFeePercent);
        setBaseFeePercent(defaultFeePercent);
        setQqsPercent(defaultQqsPercent);
        setBaseQqsPercent(defaultQqsPercent);
        setPaymentMethod("cash");
        setBasePaymentMethod("cash");
        setOrderType("dine_in");
        setBaseOrderType("dine_in");
        setActiveOrderId(null);
      }
    },
    [tableOrdersByTable, loadExistingOrderForTable, defaultFeePercent, defaultQqsPercent],
  );

  const submitOrder = async () => {
    if (!cart.length) return;
    if (isRestaurant && !selectedTable) return;

    setIsSubmitting(true);
    try {
      const existingTableOrder =
        isRestaurant && selectedTable
          ? tableOrdersByTable[selectedTable.id]
          : null;
      const token = localStorage.getItem("postoken") || "";
      const orderIdToUpdate =
        activeOrderId || existingTableOrder?.order_id || null;

      const sendToNetworkPrinters = async (
        orderId: number,
        itemsToPrint: CartItem[],
        createdAt?: string | null,
      ) => {
        if (!itemsToPrint.length) return;
        try {
          const categoryNameById = new Map(
            categories.map((c) => [c.id, normalize(c.name)]),
          );
          const payload = {
            order_id: Number(orderId),
            staff_name: CURRENT_USER_NAME,
            staff_id: CURRENT_USER_ID,
            table_id: selectedTable?.id ?? null,
            table_number: selectedTable?.number ?? null,
            table_location: selectedTable?.location ?? null,
            created_at: createdAt || new Date().toISOString(),
            items: itemsToPrint.map((item) => {
              const product = products.find((p) => p.id === item.product_id);
              const categoryName =
                product?.category_id != null
                  ? categoryNameById.get(product.category_id) || null
                  : null;
              return {
                product_id: item.product_id,
                title: item.title,
                quantity: item.quantity,
                unit_price: item.price,
                subtotal: item.quantity * item.price,
                category: categoryName,
              };
            }),
          };

          const dispatchRes = await fetch(
            `${api.staff.base}/${api.staff.printers}/dispatch`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            },
          );
          if (!dispatchRes.ok) {
            const errorData = await dispatchRes.json().catch(() => ({}));
            console.warn("Printer dispatch failed", errorData);
          }
        } catch (networkPrintError) {
          console.error("Network printer dispatch failed:", networkPrintError);
        }
      };

      if (orderIdToUpdate) {
        const baseByProduct = new Map<number, ExistingOrderItemRef[]>();
        const printerDeltaItems: CartItem[] = [];
        for (const item of baseOrderItems) {
          const list = baseByProduct.get(item.product_id) || [];
          list.push(item);
          baseByProduct.set(item.product_id, list);
        }
        const cartByProduct = new Map(cart.map((i) => [i.product_id, i]));

        for (const [productId, rows] of baseByProduct.entries()) {
          const changed = cartByProduct.get(productId);
          const primary = rows[0];
          const currentQty = rows.reduce((sum, row) => sum + row.quantity, 0);

          if (!changed) {
            for (const row of rows) {
              const delRes = await fetch(
                `${API_URL}${api.orders.base}/${api.orders.orders}/${orderIdToUpdate}/items/${row.item_id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (!delRes.ok) {
                const errorData = await delRes.json().catch(() => ({}));
                throw new Error(
                  String(errorData?.detail || "Mahsulotni o'chirib bo'lmadi"),
                );
              }
            }
            continue;
          }

          if (
            changed.quantity !== currentQty ||
            Number(changed.price) !== Number(primary.price)
          ) {
            if (changed.quantity > currentQty) {
              printerDeltaItems.push({
                product_id: changed.product_id,
                title: changed.title,
                price: changed.price,
                quantity: changed.quantity - currentQty,
              });
            }
            const putRes = await fetch(
              `${API_URL}${api.orders.base}/${api.orders.orders}/${orderIdToUpdate}/items/${primary.item_id}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  quantity: changed.quantity,
                  price: changed.price,
                }),
              },
            );
            if (!putRes.ok) {
              const errorData = await putRes.json().catch(() => ({}));
              throw new Error(
                String(errorData?.detail || "Mahsulotni yangilab bo'lmadi"),
              );
            }
          }

          for (const duplicate of rows.slice(1)) {
            const delRes = await fetch(
              `${API_URL}${api.orders.base}/${api.orders.orders}/${orderIdToUpdate}/items/${duplicate.item_id}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (!delRes.ok) {
              const errorData = await delRes.json().catch(() => ({}));
              throw new Error(
                String(
                  errorData?.detail || "Dublikat mahsulotni o'chirib bo'lmadi",
                ),
              );
            }
          }
        }

        for (const item of cart) {
          if (baseByProduct.has(item.product_id)) continue;
          printerDeltaItems.push({ ...item });
          const addRes = await fetch(
            `${API_URL}${api.orders.base}/${api.orders.orders}/${orderIdToUpdate}/items`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
              }),
            },
          );
          if (!addRes.ok) {
            const errorData = await addRes.json().catch(() => ({}));
            const detail = errorData?.detail || "Mahsulot qo'shib bo'lmadi";
            throw new Error(String(detail));
          }
        }

        if (
          feePercent !== baseFeePercent ||
          qqsPercent !== baseQqsPercent ||
          paymentMethod !== basePaymentMethod ||
          orderType !== baseOrderType
        ) {
          const feeRes = await fetch(
            `${API_URL}${api.orders.base}/${api.orders.orders}/${orderIdToUpdate}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                fee_percent: effectiveFeePercent,
                qqs_percent: qqsPercent,
                payment_method: paymentMethod,
                order_type: orderType,
              }),
            },
          );
          if (!feeRes.ok) {
            const errorData = await feeRes.json().catch(() => ({}));
            throw new Error(
              String(errorData?.detail || "Servis haqini yangilab bo'lmadi"),
            );
          }
        }

        setOrderSuccess(true);
        await fetchData();
        await fetchRestaurantTableActivity();
        await loadExistingOrderForTable(orderIdToUpdate);
        await sendToNetworkPrinters(
          orderIdToUpdate,
          printerDeltaItems,
          new Date().toISOString(),
        );
        setTimeout(() => setOrderSuccess(false), 3000);
        return;
      }

      const payload = {
        user_id: CURRENT_USER_ID,
        business_type: isRestaurant ? "restaurant" : "market",
        table_id: isRestaurant && selectedTable ? selectedTable.id : null,
        fee_percent: effectiveFeePercent,
        qqs_percent: qqsPercent,
        payment_method: paymentMethod,
        order_type: orderType,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      // 1. Create order on server
      const response = await fetch(
        `${API_URL}${api.orders.base}/${api.orders.orders}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = Array.isArray(errorData.detail)
          ? errorData.detail
              .map((e: any) => `${e.loc?.join(".")}: ${e.msg}`)
              .join(", ")
          : errorData.detail || "Failed";
        throw new Error(errorMsg);
      }

      const createdOrder = await response.json();

      // 2. Send order parts to configured network printers.
      await sendToNetworkPrinters(
        Number(createdOrder?.id),
        cart,
        createdOrder?.created_at || null,
      );

      // 3. Show success and clear cart
      setOrderSuccess(true);
      clearCart();
      setShowTableSelect(false);
      await fetchData();

      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      alert(
        `Buyurtma yaratishda xatolik: ${err instanceof Error ? err.message : "Noma'lum xatolik"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyInput = (key: string) => {
    if (key === "backspace") setSearchQuery((prev) => prev.slice(0, -1));
    else if (key === "space") setSearchQuery((prev) => prev + " ");
    else if (key === "clear") setSearchQuery("");
    else setSearchQuery((prev) => prev + key);
  };

  const keyboardLayout = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];

  if (businessLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-gray-300">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const parseOrderDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(dateStr);
    const normalized = hasTimezone ? dateStr : `${dateStr}Z`;
    const dt = new Date(normalized);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const formatElapsed = (dateStr?: string) => {
    const dt = parseOrderDate(dateStr);
    if (!dt) return "-";
    const diffMs = Math.max(0, Date.now() - dt.getTime());
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} min`;
    return `${hours} soat ${minutes} min`;
  };

  const getTableCardMeta = (table: TableItem) => {
    const activeOrder = tableOrdersByTable[table.id];
    if (!table.is_active) {
      return {
        title: "Nofaol",
        sub: "",
        price: "-",
        className: "bg-slate-100 border-slate-200 text-slate-500",
      };
    }
    if (table.status === "reserved") {
      return {
        title: "Pre-booked",
        sub: activeOrder ? formatElapsed(activeOrder.created_at) : "-",
        price: activeOrder ? formatPrice(activeOrder.total) : "-",
        className: "bg-orange-100 border-orange-300 text-orange-900",
      };
    }
    if (table.status === "occupied" || activeOrder) {
      return {
        title: activeOrder?.user_name || "Xodim noma'lum",
        sub: activeOrder ? formatElapsed(activeOrder.created_at) : "Jarayonda",
        price: activeOrder ? formatPrice(activeOrder.total) : "-",
        className: "bg-emerald-100 border-emerald-300 text-emerald-900",
      };
    }
    return {
      title: "Bo'sh",
      sub: "",
      price: "-",
      className: "bg-white border-slate-200 text-slate-700",
    };
  };

  const filteredTables = tables
    .filter((table) => table.is_active)
    .filter((table) =>
      locationFilter ? (table.location || "") === locationFilter : false,
    )
    .filter((table) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const tableOrder = tableOrdersByTable[table.id];
      return (
        table.number.toLowerCase().includes(q) ||
        (table.location || "").toLowerCase().includes(q) ||
        (tableOrder?.user_name || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      a.number.localeCompare(b.number, undefined, { numeric: true }),
    );
  const totalTablePages = Math.max(
    1,
    Math.ceil(filteredTables.length / TABLES_PER_PAGE),
  );
  const currentTablePage = Math.min(tablesPage, totalTablePages);
  const paginatedTables = filteredTables.slice(
    (currentTablePage - 1) * TABLES_PER_PAGE,
    currentTablePage * TABLES_PER_PAGE,
  );
  const locationOptions = Array.from(
    new Set(
      tables.map((t) => t.location).filter((v): v is string => Boolean(v)),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const selectedTableOrder = selectedTable
    ? tableOrdersByTable[selectedTable.id]
    : undefined;

  if (isRestaurant && !selectedTable) {
    const activeTables = tables.filter(
      (table) =>
        table.is_active &&
        (table.status === "occupied" || Boolean(tableOrdersByTable[table.id])),
    ).length;
    const bookedTables = tables.filter(
      (table) => table.is_active && table.status === "reserved",
    ).length;

    return (
      <div className="h-screen bg-slate-900 p-3 sm:p-5">
        <div className="max-w-[1800px] mx-auto h-full bg-white rounded-3xl shadow-2xl p-4 sm:p-6 flex flex-col">
          <div className="mb-5 flex gap-3 items-center flex-wrap">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-6 text-slate-400" />
              <input
                type="text"
                placeholder="Stol yoki xodim qidirish..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTablesPage(1);
                }}
                className="w-full pl-12 pr-4 h-14 sm:h-16 rounded-2xl border-2 border-slate-300 text-slate-900 text-lg"
              />
            </div>
            <button
              onClick={() => {
                fetchData();
                fetchRestaurantTableActivity();
              }}
              className="h-14 sm:h-16 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg"
            >
              Yangilash
            </button>
            <Link
              to="/staff/orders"
              className="h-14 sm:h-16 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg inline-flex items-center gap-2"
            >
              <Receipt className="size-5" />
              Buyurtmalar
            </Link>
            <button
              onClick={handleLogout}
              className="h-14 sm:h-16 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg inline-flex items-center gap-2"
            >
              <LogOut className="size-5" />
              Chiqish
            </button>
          </div>

          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Faol: {activeTables}
            </span>
            <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-800 font-bold">
              Band: {bookedTables}
            </span>
            <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold">
              Jami stol: {tables.filter((table) => table.is_active).length}
            </span>
          </div>
          {locationOptions.length > 0 && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              {locationOptions.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setLocationFilter(loc);
                    setTablesPage(1);
                  }}
                  className={`px-5 py-3 rounded-full text-base font-bold border-2 ${
                    locationFilter === loc
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {!filteredTables.length ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                {locationFilter
                  ? "Stol topilmadi"
                  : "Avval joylashuv kategoriyasini tanlang"}
              </div>
            ) : (
              <div
                className="grid gap-2 sm:gap-3 pb-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                }}
              >
                {paginatedTables.map((table) => {
                  const meta = getTableCardMeta(table);
                  const canSelect =
                    table.status === "available" ||
                    Boolean(tableOrdersByTable[table.id]);
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        if (!canSelect) return;
                        handleSelectTable(table);
                      }}
                      className={`rounded-xl border-2 p-2 text-left aspect-square transition-all active:scale-[0.99] ${canSelect ? "hover:shadow-lg cursor-pointer" : "cursor-not-allowed opacity-90"} ${meta.className}`}
                    >
                      <div className="text-xl sm:text-2xl font-black leading-none">
                        {table.number}
                      </div>
                      <div className="mt-2 text-[11px] sm:text-xs font-semibold">
                        <span className="opacity-70">Xodim: </span>
                        <span className="font-bold">{meta.title}</span>
                      </div>
                      <div className="text-[11px] sm:text-xs opacity-90 mt-1">
                        <span className="opacity-70">Vaqt: </span>
                        <span className="font-semibold">{meta.sub || "-"}</span>
                      </div>
                      <div className="text-[11px] sm:text-xs opacity-90 mt-1">
                        <span className="opacity-70">Summa: </span>
                        <span className="font-semibold">{meta.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {filteredTables.length > 0 && (
            <div className="pt-3 flex items-center justify-between gap-3 flex-wrap border-t border-slate-200">
              <div className="text-base text-slate-600 font-semibold">
                Sahifa {currentTablePage} / {totalTablePages} (
                {filteredTables.length} ta stol)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTablesPage(1)}
                  disabled={currentTablePage === 1}
                  className="h-12 px-4 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Boshiga
                </button>
                <button
                  onClick={() => setTablesPage((p) => Math.max(1, p - 1))}
                  disabled={currentTablePage === 1}
                  className="h-12 px-5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Oldingi
                </button>
                <button
                  onClick={() =>
                    setTablesPage((p) => Math.min(totalTablePages, p + 1))
                  }
                  disabled={currentTablePage === totalTablePages}
                  className="h-12 px-5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Keyingi
                </button>
                <button
                  onClick={() => setTablesPage(totalTablePages)}
                  disabled={currentTablePage === totalTablePages}
                  className="h-12 px-4 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Oxiriga
                </button>
              </div>
            </div>
          )}
        </div>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <LogOut className="size-7 text-red-600" />
                <h2 className="text-2xl text-black font-black">
                  Chiqishni tasdiqlang
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                Savatda mahsulotlar bor. Chiqsangiz, barcha ma'lumotlar
                yo'qoladi. Davom etmoqchimisiz?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-black border-2 border-gray-300 hover:bg-gray-100 font-bold transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all"
                >
                  Ha, chiqish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isRestaurant && selectedTable) {
    return (
      <div
        className="h-[100dvh] flex flex-col overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom right, rgb(15, 23, 42), rgb(30, 41, 59), rgb(15, 23, 42))",
        }}
      >
        <div className="flex-1 max-w-[2000px] mx-auto p-2 sm:p-3 lg:p-6 w-full overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-3 lg:gap-6 h-full">
            {/* ── CART PANEL ── hidden on mobile when products tab active */}
            <div
              className={`xl:col-span-4 rounded-2xl shadow-2xl p-3 sm:p-4 flex-col text-white overflow-hidden ${mobileTab === "cart" ? "flex" : "hidden xl:flex"}`}
              style={{
                background:
                  "linear-gradient(to bottom right, rgb(30, 41, 59), rgb(15, 23, 42))",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <ShoppingCart className="size-5" />
                  Tanlangan mahsulotlar ({itemCount})
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                  >
                    <Trash2 className="size-6" />
                  </button>
                )}
              </div>

              <div className="mb-4 space-y-3 flex-1 overflow-y-auto">
                {tableOrderLoading ? (
                  <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">Buyurtma yuklanmoqda...</p>
                  </div>
                ) : !cart.length ? (
                  <div className="text-center py-16 text-gray-400">
                    <ShoppingCart className="size-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Mahsulot tanlanmagan</p>
                  </div>
                ) : (
                  cart.map((item) =>
                    (() => {
                      const baseQty = baseQtyByProduct[item.product_id] || 0;
                      const isRecentlyAdded =
                        baseQty === 0 || item.quantity > baseQty;

                      return (
                        <div
                          key={item.product_id}
                          className={`rounded-xl p-2.5 sm:p-3 border ${
                            isRecentlyAdded
                              ? "bg-orange-100 border-orange-300 text-orange-900"
                              : "bg-white border-slate-200 text-slate-900"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 font-bold text-base pr-3">
                              {item.title}
                              {isRecentlyAdded && (
                                <span className="ml-2 text-xs font-bold text-orange-700">
                                  Yangi
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              className="text-red-500 hover:text-red-600 p-2 hover:bg-red-500/10 rounded-lg"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  updateQuantity(item.product_id, -1)
                                }
                                className={`h-10 w-10 rounded-lg active:scale-95 flex items-center justify-center ${
                                  isRecentlyAdded
                                    ? "bg-orange-200 hover:bg-orange-300 text-orange-900"
                                    : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                                }`}
                              >
                                <Minus className="size-4" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  setQuantity(
                                    item.product_id,
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                className={`w-14 h-10 text-center font-black text-lg border-2 rounded-lg px-2 py-1 ${
                                  isRecentlyAdded
                                    ? "border-orange-300 bg-orange-50 text-orange-900"
                                    : "border-slate-300 bg-slate-50 text-slate-900"
                                }`}
                              />
                              <button
                                onClick={() =>
                                  updateQuantity(item.product_id, 1)
                                }
                                className={`h-10 w-10 rounded-lg active:scale-95 flex items-center justify-center ${
                                  isRecentlyAdded
                                    ? "bg-orange-200 hover:bg-orange-300 text-orange-900"
                                    : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                                }`}
                              >
                                <Plus className="size-4" />
                              </button>
                            </div>
                            <div
                              className={`font-black text-lg sm:text-xl sm:text-right ${
                                isRecentlyAdded
                                  ? "text-orange-700"
                                  : "text-slate-900"
                              }`}
                            >
                              {formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      );
                    })(),
                  )
                )}
              </div>

              <div className="border-t-2 border-slate-600 pt-3 mb-3">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-600/80 px-3 py-1 text-xs font-bold text-slate-100">
                    {paymentMethod === "cash" ? "Naqd" : "Karta"}
                  </span>
                  <span className="rounded-full bg-slate-600/80 px-3 py-1 text-xs font-bold text-slate-100">
                    {orderType === "dine_in"
                      ? "Zalda"
                      : orderType === "takeaway"
                        ? "Olib ketish"
                        : "Yetkazish"}
                  </span>
                  {serviceFeeDisabled && (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      Servis haqi olinmaydi
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mb-2 text-lg">
                  <span className="text-gray-300">Mahsulotlar:</span>
                  <span className="font-bold">{itemCount} ta</span>
                </div>
                <div className="flex justify-between items-center mb-2 text-base">
                  <span className="text-gray-300">Mahsulot jami:</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center mb-2 text-base">
                  <span className="text-gray-300">QQS:</span>
                  <span className="font-semibold text-cyan-300">
                    {qqsPercent.toFixed(1)}% / {formatPrice(qqsAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2 text-base">
                  <span className="text-gray-300">Servis haqi:</span>
                  <span className="font-semibold text-orange-300">
                    {effectiveFeePercent.toFixed(1)}% / {formatPrice(feeAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-2xl font-black">
                  <span>Jami:</span>
                  <span className="text-orange-400">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "card"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                        paymentMethod === m
                          ? "bg-blue-600 text-white"
                          : "bg-slate-500 text-gray-700 hover:bg-slate-400"
                      }`}
                    >
                      {m === "cash" ? "💵 Naqd" : "💳 Karta"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(["dine_in", "takeaway", "delivery"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                        orderType === t
                          ? "bg-orange-500 text-white"
                          : "bg-slate-500 text-gray-700 hover:bg-slate-400"
                      }`}
                    >
                      {t === "dine_in" ? "🍽 Zalda" : t === "takeaway" ? "🥡 Olib ketish" : "🛵 Yetkazish"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-4 rounded-2xl text-white font-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-base sm:text-xl shadow-xl active:scale-95"
                style={{
                  background:
                    "linear-gradient(to right, rgb(22, 163, 74), rgb(34, 197, 94))",
                }}
              >
                <Check className="size-6" />
                Buyurtmani tasdiqlash
              </button>

              {/* Mobile-only action row under confirm button */}
              <div className="xl:hidden mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={completeSelectedTableOrder}
                  disabled={isCompletingOrder || !selectedTableOrder || !["pending", "ready"].includes(selectedTableOrder.status)}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs"
                >
                  {isCompletingOrder ? "..." : "To'landi"}
                </button>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs"
                >
                  Stollar
                </button>
                <button
                  onClick={handleLogout}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs"
                >
                  Chiqish
                </button>
              </div>
            </div>

            {/* ── PRODUCTS PANEL ── hidden on mobile when cart tab active */}
            <div className={`xl:col-span-6 bg-white rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-6 flex-col overflow-hidden ${mobileTab === "products" ? "flex" : "hidden xl:flex"}`}>
              {/* Compact mobile header — table name + back button */}
              <div className="xl:hidden flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-500 font-semibold shrink-0">Stol:</span>
                  <span className="font-black text-slate-900 truncate">{selectedTable.number}{selectedTable.location ? ` (${selectedTable.location})` : ""}</span>
                  {selectedTableOrder && <span className="text-xs text-emerald-600 font-bold shrink-0">{formatPrice(selectedTableOrder.total)}</span>}
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="shrink-0 h-9 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
                >
                  ← Stollar
                </button>
              </div>

              {/* Full info card — desktop only */}
              <div className="hidden xl:block mb-4 p-4 sm:p-5 rounded-2xl border-2 bg-slate-50">
                <p className="text-sm text-slate-500 font-semibold">
                  Stol ma'lumotlari
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Stol: {selectedTable.number}
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm sm:text-base text-slate-700">
                  <p>Xodim: {CURRENT_USER_NAME}</p>
                  <p>Davomiyligi: {formatElapsed(selectedTableOrder?.created_at)}</p>
                  <p>Joriy buyurtma: {selectedTableOrder ? formatPrice(selectedTableOrder.total) : "-"}</p>
                  <p>QQS: {qqsPercent.toFixed(1)}% / {formatPrice(qqsAmount)}</p>
                  <p className="sm:col-span-2">Servis haqi: {effectiveFeePercent.toFixed(1)}% / {formatPrice(feeAmount)}</p>
                </div>
              </div>

              {/* Action buttons — desktop only */}
              <div className="hidden xl:grid mb-4 grid-cols-3 gap-3">
                <button
                  onClick={completeSelectedTableOrder}
                  disabled={isCompletingOrder || !selectedTableOrder || !["pending", "ready"].includes(selectedTableOrder.status)}
                  className="px-5 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-base sm:text-lg"
                >
                  {isCompletingOrder ? "Yakunlanmoqda..." : "To'landi"}
                </button>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="px-5 py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-2xl font-bold text-base sm:text-lg"
                >
                  Stollarga qaytish
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-base sm:text-lg"
                >
                  Chiqish
                </button>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-6 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowKeyboard(true)}
                  className="w-full pl-10 pr-4 h-14 text-base sm:text-lg text-black border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
                {categories
                  .filter((c) => c.is_active)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-5 py-3 rounded-xl text-base font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedCategory === null ? (
                  <div className="text-center py-16 text-gray-400">
                    Avval kategoriya tanlang
                  </div>
                ) : !filteredProducts.length ? (
                  <div className="text-center py-16 text-gray-400">
                    Mahsulot topilmadi
                  </div>
                ) : (
                  <div
                    className="grid gap-2 pb-3"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(120px, 1fr))",
                    }}
                  >
                    {filteredProducts.map((p) => {
                      const cartQty = cart.find((i) => i.product_id === p.id)?.quantity || 0;
                      return (
                        <button
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 active:bg-orange-100 transition-all text-left active:scale-[0.97] min-h-[90px] relative"
                        >
                          <div className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">{p.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatPrice(p.price)}</div>
                          {cartQty > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{cartQty}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile bottom tab bar (restaurant + table) ── */}
        <div className="xl:hidden shrink-0 bg-slate-900 border-t border-slate-700 grid grid-cols-2">
          <button
            onClick={() => setMobileTab("products")}
            className={`py-4 flex flex-col items-center gap-1 text-xs font-bold transition-colors ${mobileTab === "products" ? "text-orange-400 bg-slate-800" : "text-slate-400"}`}
          >
            <Search className="size-5" />
            Mahsulotlar
          </button>
          <button
            onClick={() => setMobileTab("cart")}
            className={`py-4 flex flex-col items-center gap-1 text-xs font-bold transition-colors relative ${mobileTab === "cart" ? "text-green-400 bg-slate-800" : "text-slate-400"}`}
          >
            <ShoppingCart className="size-5" />
            Savat
            {itemCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-20px)] bg-orange-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{itemCount}</span>
            )}
          </button>
        </div>

        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <LogOut className="size-7 text-red-600" />
                <h2 className="text-2xl text-black font-black">
                  Chiqishni tasdiqlang
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                Savatda mahsulotlar bor. Chiqsangiz, barcha ma'lumotlar
                yo'qoladi. Davom etmoqchimisiz?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-black border-2 border-gray-300 hover:bg-gray-100 font-bold transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all"
                >
                  Ha, chiqish
                </button>
              </div>
            </div>
          </div>
        )}

        {orderSuccess && (
          <div className="fixed top-4 left-4 right-4 sm:top-8 sm:left-auto sm:right-8 sm:w-auto bg-green-600 text-white px-4 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 animate-bounce z-50">
            <Check className="size-7 sm:size-10" />
            <span className="font-black text-lg sm:text-2xl">Buyurtma yaratildi!</span>
          </div>
        )}

        {printNotification && (
          <div className="fixed top-20 left-4 right-4 sm:top-24 sm:left-auto sm:right-8 sm:w-auto bg-slate-800 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
            <Printer className="size-5 sm:size-6" />
            <span className="font-bold">{printNotification}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(to bottom right, rgb(15, 23, 42), rgb(30, 41, 59), rgb(15, 23, 42))",
      }}
    >
      <div className="flex-1 max-w-[2000px] mx-auto p-2 sm:p-3 lg:p-6 w-full overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 lg:gap-6 h-full">
          {/* ── PRODUCTS PANEL (market) ── */}
          <div className={`xl:col-span-2 bg-white rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-6 flex-col overflow-hidden ${mobileTab === "products" ? "flex" : "hidden xl:flex"}`}>
            <div className="mb-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowKeyboard(true)}
                  className="w-full pl-12 pr-14 py-3.5 sm:py-4 text-sm sm:text-lg text-black border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-medium"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="size-6 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Printer status indicator */}
              <div className="grid grid-cols-3 sm:flex gap-2">
                <button
                  onClick={checkPrinterStatus}
                  className={`px-3 py-3.5 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                    printerStatus === "connected"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : printerStatus === "disconnected"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-gray-600 text-white"
                  }`}
                  title={
                    printerStatus === "connected"
                      ? "Printer ulangan"
                      : "Printer ulanmagan"
                  }
                >
                  <Printer className="size-5 sm:size-6" />
                </button>

                <Link
                  to="/staff/orders"
                  className="px-3 sm:px-5 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-lg active:scale-95 transition-all"
                >
                  <Receipt className="size-5 sm:size-6" />
                  <span className="hidden sm:inline">Buyurtmalar</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 sm:px-5 py-3.5 sm:py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-lg active:scale-95 transition-all"
                >
                  <LogOut className="size-5 sm:size-6" />
                  <span className="hidden sm:inline">Chiqish</span>
                </button>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-2">
              {categories
                .filter((c) => c.is_active)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat.name} (
                    {
                      products.filter(
                        (p) => p.category_id === cat.id && p.is_active,
                      ).length
                    }
                    )
                  </button>
                ))}
            </div>

            <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm sm:text-base font-semibold text-gray-700">
                {selectedCategory === null
                  ? "Kategoriya tanlanmagan"
                  : `${filteredProducts.length} ta mahsulot`}
              </p>
              <div className="flex gap-2 bg-gray-100 p-2 rounded-xl">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-md text-black" : "text-gray-300"}`}
                >
                  <Grid3x3 className="size-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-md text-black" : "text-gray-300"}`}
                >
                  <List className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedCategory === null ? (
                <div className="text-center py-16 text-gray-400 text-xl">
                  Avval kategoriya tanlang
                </div>
              ) : !filteredProducts.length ? (
                <div className="text-center py-16 text-gray-400 text-xl">
                  Mahsulot topilmadi
                </div>
              ) : viewMode === "grid" ? (
                <div
                  className="grid gap-2 pb-4"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(120px, 1fr))",
                  }}
                >
                  {filteredProducts.map((p) => {
                    const cartQty = cart.find((i) => i.product_id === p.id)?.quantity || 0;
                    return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 hover:shadow-xl transition-all text-left group active:scale-95 overflow-hidden relative"
                    >
                      {cartQty > 0 && (
                        <span className="absolute top-1.5 right-1.5 z-10 bg-orange-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">{cartQty}</span>
                      )}
                      {/* Product Image */}
                      {p.image_url && !brokenImageIds[p.id] ? (
                        <div className="w-full h-20 sm:h-24 overflow-hidden bg-gray-50">
                          <img
                            src={resolveProductImageUrl(p.image_url)}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            onError={() =>
                              setBrokenImageIds((prev) => ({
                                ...prev,
                                [p.id]: true,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <UtensilsCrossed className="size-7 sm:size-8 text-amber-500/80" />
                        </div>
                      )}

                      <div className="p-2 sm:p-3">
                        <div className="font-bold text-[13px] sm:text-sm mb-1 line-clamp-2 min-h-9 sm:min-h-10 text-gray-800">
                          {p.title}
                        </div>
                        <div className="text-sm sm:text-lg font-black text-green-600 mb-1">
                          {formatPrice(p.price)}
                        </div>
                        {p.quantity !== -1 && (
                          <div
                            className={`text-[10px] sm:text-[11px] font-medium ${p.quantity === 0 ? "text-red-600" : "text-gray-600"}`}
                          >
                            {p.quantity === 0
                              ? "Tugagan"
                              : `Ombor: ${p.quantity}`}
                          </div>
                        )}
                      </div>
                    </button>
                  )})}
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full p-3 border-2 border-gray-200 rounded-2xl hover:border-orange-400 hover:bg-orange-50 hover:shadow-xl transition-all text-left flex flex-col sm:flex-row sm:items-center gap-3 group active:scale-[0.98]"
                    >
                      {/* Product Image - Compact */}
                      {p.image_url && !brokenImageIds[p.id] ? (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                          <img
                            src={resolveProductImageUrl(p.image_url)}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            onError={() =>
                              setBrokenImageIds((prev) => ({
                                ...prev,
                                [p.id]: true,
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                          <UtensilsCrossed className="size-7 text-amber-500/80" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="font-bold text-base sm:text-lg mb-1 text-gray-800">
                          {p.title}
                        </div>
                        {p.description && (
                          <div className="text-sm text-gray-600 line-clamp-1">
                            {p.description}
                          </div>
                        )}
                      </div>
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        {p.quantity !== -1 && (
                          <span
                            className={`text-sm font-medium ${p.quantity === 0 ? "text-red-600" : "text-gray-600"}`}
                          >
                            {p.quantity === 0
                              ? "Tugagan"
                              : `Ombor: ${p.quantity}`}
                          </span>
                        )}
                        <span className="text-xl sm:text-2xl font-black text-green-600 sm:min-w-[140px] sm:text-right">
                          {formatPrice(p.price)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CART PANEL (market) ── */}
          <div
            className={`rounded-2xl shadow-2xl p-4 sm:p-5 flex-col text-white xl:overflow-hidden ${mobileTab === "cart" ? "flex" : "hidden xl:flex"}`}
            style={{
              background:
                "linear-gradient(to bottom right, rgb(30, 41, 59), rgb(15, 23, 42))",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3">
                <ShoppingCart className="size-6 sm:size-7" />
                Savat ({itemCount})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <Trash2 className="size-6" />
                </button>
              )}
            </div>

            {isRestaurant && selectedTable && (
              <div className="mb-4 p-4 bg-blue-600/30 rounded-xl border-2 border-blue-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-5" />
                    <span className="font-bold">
                      Stol: {selectedTable.number}
                    </span>
                    {selectedTable.capacity && (
                      <span className="text-sm text-blue-200">
                        ({selectedTable.capacity} odam)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="mb-3 space-y-2.5 xl:flex-1 xl:overflow-y-auto max-h-[40vh] overflow-y-auto xl:max-h-none">
              {!cart.length ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingCart className="size-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Savat bo'sh</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="bg-slate-700/50 rounded-xl p-3"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 font-bold text-base pr-3">
                        {item.title}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="p-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 active:scale-95"
                        >
                          <Minus className="size-5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setQuantity(
                              item.product_id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-14 text-center font-black text-lg border-2 border-slate-500 rounded-xl px-2 py-2 bg-slate-600 text-white"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="p-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 active:scale-95"
                        >
                          <Plus className="size-5" />
                        </button>
                      </div>
                      <div className="font-black text-lg sm:text-xl text-green-400 sm:text-right">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t-2 border-slate-600 pt-4 mb-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-600/80 px-3 py-1 text-xs font-bold text-slate-100">
                      {paymentMethod === "cash" ? "Naqd" : "Karta"}
                    </span>
                    <span className="rounded-full bg-slate-600/80 px-3 py-1 text-xs font-bold text-slate-100">
                      {orderType === "dine_in"
                        ? "Zalda"
                        : orderType === "takeaway"
                          ? "Olib ketish"
                          : "Yetkazish"}
                    </span>
                    {serviceFeeDisabled && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                        Servis haqi olinmaydi
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mb-2 text-lg">
                    <span className="text-gray-300">Mahsulotlar:</span>
                    <span className="font-bold">{itemCount} ta</span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-base">
                    <span className="text-gray-300">Mahsulot jami:</span>
                    <span className="font-semibold">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-base">
                    <span className="text-gray-300">QQS:</span>
                    <span className="font-semibold text-cyan-300">
                      {qqsPercent.toFixed(1)}% / {formatPrice(qqsAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2 text-base">
                    <span className="text-gray-300">Servis haqi:</span>
                    <span className="font-semibold text-orange-300">
                      {effectiveFeePercent.toFixed(1)}% / {formatPrice(feeAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-3xl font-black">
                    <span>Jami:</span>
                    <span className="text-green-400">{formatPrice(total)}</span>
                  </div>
                </div>
                <div className="mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(["cash", "card"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                          paymentMethod === m
                            ? "bg-blue-600 text-white"
                            : "bg-slate-600 text-gray-300 hover:bg-slate-500"
                        }`}
                      >
                        {m === "cash" ? "💵 Naqd" : "💳 Karta"}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(["dine_in", "takeaway", "delivery"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setOrderType(t)}
                          className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                          orderType === t
                            ? "bg-orange-600 text-white"
                            : "bg-slate-600 text-gray-300 hover:bg-slate-500"
                        }`}
                      >
                        {t === "dine_in" ? "🍽 Zalda" : t === "takeaway" ? "🥡 Olib ketish" : "🛵 Yetkazish"}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full py-4 sm:py-5 rounded-2xl text-white font-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-base sm:text-xl shadow-xl active:scale-95"
                  style={{
                    background:
                      "linear-gradient(to right, rgb(22, 163, 74), rgb(34, 197, 94))",
                  }}
                >
                  <Check className="size-7" />
                  {isRestaurant ? "Stolni tanlash" : "Buyurtmani tasdiqlash"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar (market / restaurant without table) ── */}
      <div className="xl:hidden shrink-0 bg-slate-900 border-t border-slate-700 grid grid-cols-2">
        <button
          onClick={() => setMobileTab("products")}
          className={`py-4 flex flex-col items-center gap-1 text-xs font-bold transition-colors ${mobileTab === "products" ? "text-orange-400 bg-slate-800" : "text-slate-400"}`}
        >
          <Search className="size-5" />
          Mahsulotlar
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`py-4 flex flex-col items-center gap-1 text-xs font-bold transition-colors relative ${mobileTab === "cart" ? "text-green-400 bg-slate-800" : "text-slate-400"}`}
        >
          <ShoppingCart className="size-5" />
          Savat
          {itemCount > 0 && (
            <span className="absolute top-2 right-[calc(50%-20px)] bg-orange-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{itemCount}</span>
          )}
        </button>
      </div>

      {showTableSelect && isRestaurant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b flex items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-black">
                <Users className="size-6 sm:size-7 text-blue-600" />
                Stolni tanlang
              </h2>
              <button
                onClick={() => setShowTableSelect(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {!availableTables.length ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="size-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl">Bo'sh stol yo'q</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {availableTables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={`p-4 sm:p-6 rounded-2xl border-2 transition-all ${
                        selectedTable?.id === table.id
                          ? "border-blue-600 bg-blue-50 shadow-lg"
                          : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                      }`}
                    >
                      <div className="text-center">
                        <Users
                          className={`size-10 sm:size-12 mx-auto mb-3 ${selectedTable?.id === table.id ? "text-blue-600" : "text-gray-400"}`}
                        />
                        <div className="text-xl sm:text-2xl font-black mb-1">
                          {table.number}
                        </div>
                        {table.capacity && (
                          <div className="text-sm text-gray-600">
                            {table.capacity} odam
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTable && (
              <div className="p-4 sm:p-6 border-t bg-gray-50">
                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full py-4 sm:py-5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black text-base sm:text-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl active:scale-95"
                >
                  {isSubmitting ? (
                    "Yuklanmoqda..."
                  ) : (
                    <>
                      <Check className="size-7" />
                      Buyurtmani tasdiqlash
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <LogOut className="size-7 text-red-600" />
              <h2 className="text-2xl text-black font-black">
                Chiqishni tasdiqlang
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Savatda mahsulotlar bor. Chiqsangiz, barcha ma'lumotlar yo'qoladi.
              Davom etmoqchimisiz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl text-black border-2 border-gray-300 hover:bg-gray-100 font-bold transition-all"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {showKeyboard && (
        <div className="fixed inset-x-0 bottom-0 z-[100] bg-slate-800/98 border-t-4 border-slate-700 p-3 sm:p-4 shadow-2xl backdrop-blur max-h-[55vh] overflow-y-auto">
          <div className="max-w-[2000px] mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold">Virtual Keyboard</span>
              <button
                onClick={() => setShowKeyboard(false)}
                className="text-white hover:text-red-400 p-2"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="space-y-2">
              {keyboardLayout.map((row, i) => (
                <div key={i} className="flex gap-1.5 sm:gap-2 justify-center">
                  {row.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeyInput(key)}
                      className="min-w-[32px] sm:min-w-[52px] px-2 h-10 sm:h-12 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 rounded-lg shadow-lg font-bold text-xs sm:text-base text-white transition-all active:scale-95"
                    >
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 justify-center">
                <button
                  onClick={() => handleKeyInput("space")}
                  className="w-full sm:flex-1 sm:max-w-md h-10 sm:h-12 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 rounded-lg shadow-lg font-bold text-sm sm:text-base text-white transition-all active:scale-95"
                >
                  BO'SH JOY
                </button>
                <button
                  onClick={() => handleKeyInput("backspace")}
                  className="w-full sm:min-w-[120px] h-10 sm:h-12 bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-lg font-bold text-sm sm:text-base transition-all active:scale-95"
                >
                  O'CHIRISH
                </button>
                <button
                  onClick={() => handleKeyInput("clear")}
                  className="w-full sm:min-w-[100px] h-10 sm:h-12 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg font-bold text-sm sm:text-base transition-all active:scale-95"
                >
                  TOZALASH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="fixed top-4 left-4 right-4 sm:top-8 sm:left-auto sm:right-8 sm:w-auto bg-green-600 text-white px-4 sm:px-8 py-4 sm:py-6 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 animate-bounce z-50">
          <Check className="size-7 sm:size-10" />
          <span className="font-black text-lg sm:text-2xl">Buyurtma yaratildi!</span>
        </div>
      )}

      {printNotification && (
        <div className="fixed top-20 left-4 right-4 sm:top-24 sm:left-auto sm:right-8 sm:w-auto bg-slate-800 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
          <Printer className="size-5 sm:size-6" />
          <span className="font-bold">{printNotification}</span>
        </div>
      )}
    </div>
  );
}
