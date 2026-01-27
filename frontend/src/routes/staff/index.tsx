import { api } from '@/config'
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, Grid3x3, List, Minus, Plus, Search, ShoppingCart, X, Receipt, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'

const CURRENT_USER_ID = Number(localStorage.getItem("userId"))

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

const formatPrice = (price: number) => `${Math.floor(price).toLocaleString('uz-UZ')} so'm`

export const Route = createFileRoute('/staff/')({
  component: () => (
    <AuthGuard allowedRoles={['staff']}>
      <POSTerminal />
    </AuthGuard>
  ),
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${api.staff.base}/${api.staff.products}`),
        fetch(`${api.staff.base}/${api.staff.categories}`)
      ])
      
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      
      setProducts(productsData.products || [])
      setCategories(categoriesData.categories || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory
    const isActive = p.is_active
    return matchesSearch && matchesCategory && isActive
  })

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { product_id: product.id, title: product.title, price: product.price, quantity }]
    })
  }, [])

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }, [])

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product_id !== productId))
      return
    }
    setCart(prev => prev.map(item => 
      item.product_id === productId ? { ...item, quantity } : item
    ))
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCart(prev => prev.filter(item => item.product_id !== productId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const submitOrder = async () => {
    if (!cart.length) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${api.staff.base}/${api.staff.orders}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: CURRENT_USER_ID,
          items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      })

      if (!response.ok) throw new Error('Failed')

      setOrderSuccess(true)
      clearCart()
      setTimeout(() => setOrderSuccess(false), 3000)
    } catch {
      alert('Failed to create order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyInput = (key: string) => {
    if (key === 'backspace') setSearchQuery(prev => prev.slice(0, -1))
    else if (key === 'space') setSearchQuery(prev => prev + ' ')
    else if (key === 'clear') setSearchQuery('')
    else setSearchQuery(prev => prev + key)
  }

  const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'linear-gradient(to bottom right, rgb(15, 23, 42), rgb(30, 41, 59), rgb(15, 23, 42))' }}>
      <div className="flex-1 max-w-[2000px] mx-auto p-4 lg:p-6 w-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-full">
          
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-2xl p-4 lg:p-6 flex flex-col overflow-hidden">
            <div className="mb-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-6 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowKeyboard(true)}
                  className="w-full pl-14 pr-16 py-5 text-xl border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-medium"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg">
                    <X className="size-6 text-gray-500" />
                  </button>
                )}
              </div>
              <Link to="/staff/orders" className="px-6 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center gap-3 shadow-lg active:scale-95 transition-all">
                <Receipt className="size-6" />
                Buyurtmalar
              </Link>
            </div>

            <div className="mb-4 flex items-center gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === null ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hammasi ({products.filter(p => p.is_active).length})
              </button>
              {categories.filter(c => c.is_active).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name} ({products.filter(p => p.category_id === cat.id && p.is_active).length})
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-gray-700">{filteredProducts.length} ta mahsulot</p>
              <div className="flex gap-2 bg-gray-100 p-2 rounded-xl">
                <button onClick={() => setViewMode('grid')} className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md' : ''}`}>
                  <Grid3x3 className="size-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md' : ''}`}>
                  <List className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-32 text-gray-400 text-xl">Yuklanmoqda...</div>
              ) : !filteredProducts.length ? (
                <div className="text-center py-32 text-gray-400 text-xl">Mahsulot topilmadi</div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-xl transition-all text-left group active:scale-95"
                    >
                      <div className="font-bold text-base mb-3 line-clamp-2 min-h-12 text-gray-800">{p.title}</div>
                      <div className="text-2xl font-black text-green-600 mb-3">{formatPrice(p.price)}</div>
                      {p.quantity !== -1 && (
                        <div className={`text-sm font-medium ${p.quantity === 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {p.quantity === 0 ? 'Tugagan' : `Ombor: ${p.quantity}`}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Plus className="size-5" />
                        <span className="text-base font-bold">Qo'shish</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-xl transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-1 text-gray-800">{p.title}</div>
                        {p.description && <div className="text-sm text-gray-600 line-clamp-1">{p.description}</div>}
                      </div>
                      <div className="flex items-center gap-6">
                        {p.quantity !== -1 && (
                          <span className={`text-sm font-medium ${p.quantity === 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {p.quantity === 0 ? 'Tugagan' : `Ombor: ${p.quantity}`}
                          </span>
                        )}
                        <span className="text-2xl font-black text-green-600 min-w-[140px] text-right">{formatPrice(p.price)}</span>
                        <Plus className="size-7 text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl shadow-2xl p-6 flex flex-col text-white overflow-hidden" style={{ background: 'linear-gradient(to bottom right, rgb(30, 41, 59), rgb(15, 23, 42))' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <ShoppingCart className="size-7" />
                Savat ({itemCount})
              </h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all">
                  <Trash2 className="size-6" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {!cart.length ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingCart className="size-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Savat bo'sh</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="bg-slate-700/50 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 font-bold text-base pr-3">{item.title}</div>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg">
                        <X className="size-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product_id, -1)} className="p-3 rounded-xl bg-slate-600 hover:bg-slate-500 active:scale-95">
                          <Minus className="size-5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => setQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center font-black text-xl border-2 border-slate-500 rounded-xl px-2 py-2 bg-slate-600 text-white"
                        />
                        <button onClick={() => updateQuantity(item.product_id, 1)} className="p-3 rounded-xl bg-slate-600 hover:bg-slate-500 active:scale-95">
                          <Plus className="size-5" />
                        </button>
                      </div>
                      <div className="font-black text-xl text-green-400">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="border-t-2 border-slate-600 pt-4 mb-4">
                  <div className="flex justify-between items-center mb-2 text-lg">
                    <span className="text-gray-300">Mahsulotlar:</span>
                    <span className="font-bold">{itemCount} ta</span>
                  </div>
                  <div className="flex justify-between items-center text-3xl font-black">
                    <span>Jami:</span>
                    <span className="text-green-400">{formatPrice(total)}</span>
                  </div>
                </div>
                <button
                  onClick={submitOrder}
                  disabled={isSubmitting}
                  className="w-full py-5 rounded-2xl text-white font-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-xl shadow-xl active:scale-95"
                  style={{ background: isSubmitting ? 'rgb(34, 197, 94)' : 'linear-gradient(to right, rgb(22, 163, 74), rgb(34, 197, 94))' }}
                >
                  {isSubmitting ? "Yuklanmoqda..." : (
                    <>
                      <Check className="size-7" />
                      Buyurtmani yakunlash
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showKeyboard && (
        <div className="bg-slate-800 border-t-4 border-slate-700 p-4 shadow-2xl">
          <div className="max-w-[2000px] mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold">Virtual Keyboard</span>
              <button onClick={() => setShowKeyboard(false)} className="text-white hover:text-red-400 p-2">
                <X className="size-6" />
              </button>
            </div>
            <div className="space-y-2">
              {keyboardLayout.map((row, i) => (
                <div key={i} className="flex gap-2 justify-center">
                  {row.map(key => (
                    <button key={key} onClick={() => handleKeyInput(key)} className="min-w-[52px] h-12 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 rounded-lg shadow-lg font-bold text-white transition-all active:scale-95">
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              ))}
              <div className="flex gap-2 justify-center">
                <button onClick={() => handleKeyInput('space')} className="flex-1 max-w-md h-12 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 rounded-lg shadow-lg font-bold text-white transition-all active:scale-95">
                  BO'SH JOY
                </button>
                <button onClick={() => handleKeyInput('backspace')} className="min-w-[120px] h-12 bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-lg font-bold transition-all active:scale-95">
                  O'CHIRISH
                </button>
                <button onClick={() => handleKeyInput('clear')} className="min-w-[100px] h-12 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg font-bold transition-all active:scale-95">
                  TOZALASH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="fixed top-8 right-8 bg-green-600 text-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce z-50">
          <Check className="size-10" />
          <span className="font-black text-2xl">Buyurtma yaratildi!</span>
        </div>
      )}
    </div>
  )
}