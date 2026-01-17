import { useState, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  X,
  Check,
} from "lucide-react"
import { API_URL } from "@/config"

const PRODUCTS_API = `${API_URL}:8002/products`
const ORDERS_API = `${API_URL}:8004/orders`

const CURRENT_USER_ID = 1

export const Route = createFileRoute("/staff/")({
  component: POSTerminal,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      {error.message}
    </div>
  ),
})

type Product = {
  id: number
  title: string
  price: number
  quantity: number
  is_active: boolean
}

type CartItem = {
  product_id: number
  title: string
  price: number
  quantity: number
}

function POSTerminal() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(PRODUCTS_API)
      const data = await res.json()

      const activeProducts: Product[] = (data.products || [])
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          ...p,
          price: Number(p.price), // ✅ normalize here
        }))

      setProducts(activeProducts)
    } catch (err) {
      console.error("Error fetching products:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.product_id === product.id)

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      )
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
        },
      ])
    }
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart(
      cart.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    )
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product_id !== productId))
  }

  const clearCart = () => setCart([])

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  const submitOrder = async () => {
    if (!cart.length) return

    setIsSubmitting(true)
    try {
      const payload = {
        user_id: CURRENT_USER_ID,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      const res = await fetch(ORDERS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to create order")

      setOrderSuccess(true)
      clearCart()
      setTimeout(() => setOrderSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      alert("Failed to create order")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Products</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg"
            />
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-gray-400">
              Loading products...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                >
                  <div className="font-semibold text-sm mb-1 line-clamp-2">
                    {p.title}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ${p.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="bg-white rounded-lg shadow p-6 lg:sticky lg:top-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <ShoppingCart className="size-6" />
            Cart ({cart.length})
          </h2>

          {cart.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              Cart is empty
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product_id} className="border p-3 rounded">
                    <div className="flex justify-between mb-2">
                      <span>{item.title}</span>
                      <button onClick={() => removeFromCart(item.product_id)}>
                        <X className="size-4 text-red-500" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product_id, -1)}>
                          <Minus className="size-4" />
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, 1)}>
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <span className="font-bold text-green-600">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-4 text-xl font-bold flex justify-between">
                <span>Total</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
              </div>

              <button
                disabled={isSubmitting}
                onClick={submitOrder}
                className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg font-bold"
              >
                {isSubmitting ? "Processing..." : "Complete Order"}
              </button>
            </>
          )}
        </div>
      </div>

      {orderSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-4 rounded shadow flex items-center gap-2">
          <Check className="size-5" />
          Order created successfully
        </div>
      )}
    </div>
  )
}

export default POSTerminal
