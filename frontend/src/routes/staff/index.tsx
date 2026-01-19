import { createFileRoute } from '@tanstack/react-router'
import { Check, Delete, Grid3x3, List, Minus, Plus, Search, ShoppingCart, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { API_URL } from '@/config'

const STAFF_API = `${API_URL}:8005`

const CURRENT_USER_ID = 1

interface Product {
  id: number
  title: string
  description: string | null
  category_id: number | null
  quantity: number
  price: number
  is_active: boolean
}

interface Category {
  id: number
  name: string
  is_active: boolean
}

interface CartItem {
  product_id: number
  title: string
  price: number
  quantity: number
}

export const Route = createFileRoute("/staff/")({
  component: POSTerminal,
})
export default function POSTerminal() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${STAFF_API}/products`),
        fetch(`${STAFF_API}/categories`)
      ])
      
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      
      setProducts(productsData.products || [])
      setCategories(categoriesData.categories || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addToCart = (product: Product, quantity: number = 1) => {
    const existing = cart.find(item => item.product_id === product.id)
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
    } else {
      setCart([...cart, {
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity
      }])
    }
  }

  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const setQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(cart.map(item => 
      item.product_id === productId ? { ...item, quantity } : item
    ))
  }

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const clearCart = () => setCart([])

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const submitOrder = async () => {
    if (cart.length === 0) return

    setIsSubmitting(true)
    try {
      const orderData = {
        user_id: CURRENT_USER_ID,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }))
      }

      const response = await fetch(`${STAFF_API}/orders?user_id=${CURRENT_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData.items)
      })

      if (!response.ok) throw new Error('Failed to create order')

      setOrderSuccess(true)
      clearCart()
      setTimeout(() => setOrderSuccess(false), 3000)
    } catch (err) {
      console.error('Error creating order:', err)
      alert('Failed to create order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyboardInput = (key: string) => {
    if (key === 'backspace') {
      setSearchQuery(prev => prev.slice(0, -1))
    } else if (key === 'space') {
      setSearchQuery(prev => prev + ' ')
    } else if (key === 'clear') {
      setSearchQuery('')
    } else {
      setSearchQuery(prev => prev + key)
    }
  }

  const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-[2000px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          
          {/* Products Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-2xl p-4 lg:p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-6 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowKeyboard(true)}
                  className="w-full pl-14 pr-4 py-5 text-xl border-3 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-medium"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="size-6 text-gray-500" />
                  </button>
                )}
              </div>

              {/* On-Screen Keyboard */}
              {showKeyboard && (
                <div className="mt-4 bg-slate-100 p-4 rounded-2xl shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-600">KEYBOARD</span>
                    <button
                      onClick={() => setShowKeyboard(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium"
                    >
                      Hide
                    </button>
                  </div>
                  <div className="space-y-2">
                    {keyboardLayout.map((row, i) => (
                      <div key={i} className="flex gap-2 justify-center">
                        {row.map(key => (
                          <button
                            key={key}
                            onClick={() => handleKeyboardInput(key)}
                            className="min-w-[48px] h-14 bg-white hover:bg-blue-100 active:bg-blue-200 rounded-lg shadow font-semibold text-lg transition-all"
                          >
                            {key.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleKeyboardInput('space')}
                        className="flex-1 h-14 bg-white hover:bg-blue-100 active:bg-blue-200 rounded-lg shadow font-semibold transition-all"
                      >
                        SPACE
                      </button>
                      <button
                        onClick={() => handleKeyboardInput('backspace')}
                        className="min-w-[120px] h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <Delete className="size-5" />
                        DELETE
                      </button>
                      <button
                        onClick={() => handleKeyboardInput('clear')}
                        className="min-w-[100px] h-14 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow font-semibold transition-all"
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category Tabs */}
            <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-4 rounded-xl font-bold text-lg whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-4 rounded-xl font-bold text-lg whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-700">
                {filteredProducts.length} products
              </p>
              <div className="flex gap-2 bg-gray-100 p-2 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md' : ''}`}
                >
                  <Grid3x3 className="size-6" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md' : ''}`}
                >
                  <List className="size-6" />
                </button>
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="text-center py-32 text-gray-400 text-xl">Loading products...</div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(100vh-500px)] overflow-y-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-5 border-3 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-xl transition-all text-left group active:scale-95"
                  >
                    <div className="font-bold text-lg mb-3 line-clamp-2 min-h-[3.5rem] text-gray-800">
                      {product.title}
                    </div>
                    <div className="text-3xl font-black text-green-600 mb-3">
                      ${product.price.toFixed(2)}
                    </div>
                    {product.quantity !== -1 && (
                      <div className="text-sm text-gray-600 font-medium">
                        Stock: {product.quantity}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                      <Plus className="size-6" />
                      <span className="text-lg font-bold">Add</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-500px)] overflow-y-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full p-5 border-3 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-xl transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-xl mb-2 text-gray-800">{product.title}</div>
                      {product.description && (
                        <div className="text-base text-gray-600 line-clamp-1">{product.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      {product.quantity !== -1 && (
                        <span className="text-base text-gray-600 font-medium">Stock: {product.quantity}</span>
                      )}
                      <span className="text-3xl font-black text-green-600 min-w-[100px] text-right">
                        ${product.price.toFixed(2)}
                      </span>
                      <Plus className="size-8 text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 lg:sticky lg:top-6 h-fit text-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <ShoppingCart className="size-8" />
                Cart ({itemCount})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 text-lg font-bold px-4 py-2 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-3 mb-6 max-h-[calc(100vh-450px)] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingCart className="size-20 mx-auto mb-4 opacity-20" />
                  <p className="text-xl">Cart is empty</p>
                  <p className="text-base mt-2">Tap products to add</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="bg-slate-700/50 rounded-xl p-4 backdrop-blur">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 font-bold text-lg pr-3">{item.title}</div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                      >
                        <X className="size-6" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="p-3 rounded-xl bg-slate-600 hover:bg-slate-500 active:scale-95 transition-all"
                        >
                          <Minus className="size-6" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => setQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-20 text-center font-black text-2xl border-3 border-slate-500 rounded-xl px-3 py-2 bg-slate-600 text-white"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="p-3 rounded-xl bg-slate-600 hover:bg-slate-500 active:scale-95 transition-all"
                        >
                          <Plus className="size-6" />
                        </button>
                      </div>
                      <div className="font-black text-2xl text-green-400">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t-2 border-slate-600 pt-6 mb-6">
                  <div className="flex justify-between items-center mb-3 text-xl">
                    <span className="text-gray-300">Items:</span>
                    <span className="font-bold">{itemCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-4xl font-black">
                    <span>Total:</span>
                    <span className="text-green-400">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full py-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-black rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-2xl shadow-xl hover:shadow-2xl active:scale-95"
                >
                  {isSubmitting ? (
                    'Processing...'
                  ) : (
                    <>
                      <Check className="size-8" />
                      Complete Order
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {orderSuccess && (
        <div className="fixed bottom-8 right-8 bg-green-600 text-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce z-50">
          <Check className="size-10" />
          <span className="font-black text-2xl">Order Complete!</span>
        </div>
      )}
    </div>
  )
}