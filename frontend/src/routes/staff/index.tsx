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
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === null || p.category_id === selectedCategory;
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
    setHighlightedIndex(-1);
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

  const setQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      ),
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

      if (!response.ok) throw new Error("Failed to create order");

      setOrderSuccess(true);
      clearCart();
      setTimeout(() => setOrderSuccess(false), 3000);
      searchInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      alert("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          addToCart(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    setHighlightedIndex(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-[2000px] mx-auto p-3 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Products Section */}
          <div className="lg:col-span-2 bg-white text-gray-900 rounded-lg shadow-lg p-4 sm:p-6">
            {/* Search Bar */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                autoComplete="off"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl">
                  {suggestions.map((product, index) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full px-4 py-3 text-left text-gray-900 hover:bg-blue-50 border-b last:border-b-0 ${
                        highlightedIndex === index ? "bg-blue-100" : ""
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">
                          {product.title}
                        </span>
                        <span className="font-bold text-green-600">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Tabs (RESTORED) */}
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedCategory === null
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredProducts.length} products
              </p>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded text-gray-700 ${
                    viewMode === "grid" ? "bg-white shadow" : ""
                  }`}
                >
                  <Grid3x3 className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded text-gray-700 ${
                    viewMode === "list" ? "bg-white shadow" : ""
                  }`}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>

            {/* Products Grid/List */}
            {isLoading ? (
              <div className="text-center py-20 text-gray-400">
                Loading products...
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 sm:p-4 border-2 border-gray-200 rounded-lg bg-white text-gray-900 hover:border-blue-500 hover:bg-blue-50 transition text-left"
                  >
                    <div className="font-semibold text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                      {product.title}
                    </div>
                    <div className="text-xl font-bold text-green-600 mb-2">
                      ${product.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg bg-white text-gray-900 hover:border-blue-500 hover:bg-blue-50 transition text-left flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold mb-1">
                        {product.title}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {product.description}
                        </div>
                      )}
                    </div>
                    <span className="text-xl font-bold text-green-600 min-w-[80px] text-right">
                      ${product.price.toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="bg-white text-gray-900 rounded-lg shadow-lg p-4 sm:p-6 lg:sticky lg:top-4 h-fit">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <ShoppingCart className="text-gray-700" />
              Cart ({itemCount})
            </h2>

            {cart.map((item) => (
              <div
                key={item.product_id}
                className="border border-gray-200 rounded-lg p-3 mb-2"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm pr-2">
                    {item.title}
                  </div>
                  <button onClick={() => removeFromCart(item.product_id)}>
                    <X className="size-4 text-red-500" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-900"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <div className="font-bold text-green-600">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <>
                <div className="border-t pt-4 mt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full py-4 mt-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
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
