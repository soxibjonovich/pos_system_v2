import { API_URL } from "@/config";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Grid3x3,
  List,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PRODUCTS_API = `${API_URL}:8002/products`;
const CATEGORIES_API = `${API_URL}:8002/categories`;
const ORDERS_API = `${API_URL}:8004/orders`;

const CURRENT_USER_ID = 1;

interface Product {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  quantity: number;
  price: number;
  is_active: boolean;
}

interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

interface CartItem {
  product_id: number;
  title: string;
  price: number;
  quantity: number;
}

export const Route = createFileRoute("/staff/")({
  component: POSTerminal,
});

export default function POSTerminal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(PRODUCTS_API),
        fetch(CATEGORIES_API),
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      setProducts(
        (productsData.products || []).filter((p: Product) => p.is_active),
      );
      setCategories(
        (categoriesData.categories || []).filter((c: Category) => c.is_active),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const suggestions = searchQuery.trim()
    ? products
        .filter((p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  const addToCart = (product: Product, quantity: number = 1) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          title: product.title,
          price: product.price,
          quantity,
        },
      ]);
    }
    setSearchQuery("");
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(ORDERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: CURRENT_USER_ID,
          items: cart,
        }),
      });

      if (!response.ok) throw new Error();

      setOrderSuccess(true);
      clearCart();
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch {
      alert("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-[2000px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* PRODUCTS */}
          <div className="lg:col-span-2 bg-white text-gray-900 rounded-lg shadow p-6">
            {/* SEARCH */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(!!e.target.value);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Search products..."
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="w-full px-4 py-3 text-left text-gray-900 hover:bg-blue-50 border-b last:border-b-0"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{product.title}</span>
                        <span className="font-bold text-green-600">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCTS GRID */}
            {isLoading ? (
              <div className="py-20 text-center text-gray-500">
                Loading products...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="border border-gray-200 rounded-lg p-4 bg-white text-gray-900 hover:bg-blue-50 hover:border-blue-500"
                  >
                    <div className="font-semibold line-clamp-2">
                      {product.title}
                    </div>
                    <div className="text-lg font-bold text-green-600 mt-2">
                      ${product.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CART */}
          <div className="bg-white text-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <ShoppingCart className="text-gray-700" />
              Cart ({itemCount})
            </h2>

            {cart.map((item) => (
              <div
                key={item.product_id}
                className="border border-gray-200 rounded-lg p-3 mb-2"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{item.title}</span>
                  <button onClick={() => removeFromCart(item.product_id)}>
                    <X className="size-4 text-red-500" />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.product_id, -1)
                      }
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-900"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product_id, 1)
                      }
                      className="p-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-900"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <span className="font-bold text-green-600">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <>
                <div className="border-t mt-4 pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  Complete Order
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {orderSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-2">
          <Check />
          Order created successfully!
        </div>
      )}
    </div>
  );
}
