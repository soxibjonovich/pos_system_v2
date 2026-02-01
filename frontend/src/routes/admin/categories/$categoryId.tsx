import { Button } from "@/components/ui/button"
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
import { api } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Package, Search, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface Category {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

interface Product {
  id: number
  title: string
  description: string | null
  category_id: number | null
  quantity: number
  price: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

const formatPrice = (n: number) => `${Math.floor(n).toLocaleString('uz-UZ')} so'm`

export const Route = createFileRoute('/admin/categories/$categoryId')({
  component: () => (
    <AuthGuard allowedRoles={['admin']}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { categoryId } = Route.useParams()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(`${api.admin.base}/${api.admin.categories}/${categoryId}`, { headers: headers() }),
        fetch(`${api.admin.base}/${api.admin.products}`, { headers: headers() })
      ])

      if (!catRes.ok) throw new Error('Kategoriya topilmadi')
      if (!prodRes.ok) throw new Error('Mahsulotlar yuklanish xatosi')

      const catData: Category = await catRes.json()
      const prodData = await prodRes.json()
      const all: Product[] = prodData.products || []
      const filtered = all.filter(p => p.category_id === parseInt(categoryId))

      setCategory(catData)
      setProducts(filtered)
      setFilteredProducts(filtered)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsLoading(false)
    }
  }, [categoryId, token])

  useEffect(() => {
    if (token) fetchData()
  }, [fetchData, token])

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredProducts(products); return }
    const q = searchQuery.toLowerCase()
    setFilteredProducts(products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ))
  }, [searchQuery, products])

  const totalValue = products.reduce((s, p) => s + (p.price * (p.quantity === -1 ? 0 : p.quantity)), 0)
  const activeCount = products.filter(p => p.is_active).length
  const outOfStock = products.filter(p => p.quantity === 0).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="size-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="size-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-4">{error || 'Kategoriya topilmadi'}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate({ to: '/admin/categories' })}>
              <ArrowLeft className="size-4 mr-2" />Qaytish
            </Button>
            <Button onClick={fetchData}>
              <RefreshCw className="size-4 mr-2" />Qayta yuklash
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/admin/categories' })}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            <span style={{
              backgroundColor: category.is_active ? '#dcfce7' : '#f3f4f6',
              color: category.is_active ? '#166534' : '#374151'
            }} className="inline-flex px-3 py-1 rounded-full text-xs font-bold">
              {category.is_active ? 'Faol' : 'Faol emas'}
            </span>
          </div>
          {category.description && <p className="text-gray-500 mt-1">{category.description}</p>}
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="size-4 mr-2" />Yangilash
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-blue-600">{products.length}</div>
          <div className="text-sm text-gray-500 mt-1">Barcha mahsulotlar</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-green-600">{activeCount}</div>
          <div className="text-sm text-gray-500 mt-1">Faol</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-red-600">{outOfStock}</div>
          <div className="text-sm text-gray-500 mt-1">Tugangan</div>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-black text-purple-600">{formatPrice(totalValue)}</div>
          <div className="text-sm text-gray-500 mt-1">Ombor qiymat</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Mahsulot qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        {searchQuery && (
          <Button variant="outline" onClick={() => setSearchQuery('')}>Tozalash</Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
        <Table>
          <TableCaption className="py-3 text-gray-500">
            {!filteredProducts.length
              ? 'Bu kategoriyada mahsulot yo\'q'
              : `${filteredProducts.length} / ${products.length} ta mahsulot ko'rsatilmoqda`}
          </TableCaption>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#f9fafb' }}>
              <TableHead className="font-bold text-gray-900">#</TableHead>
              <TableHead className="font-bold text-gray-900">Mahsulot</TableHead>
              <TableHead className="font-bold text-gray-900">Tavsif</TableHead>
              <TableHead className="font-bold text-gray-900">Ombor</TableHead>
              <TableHead className="font-bold text-gray-900">Narx</TableHead>
              <TableHead className="font-bold text-gray-900">Holat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredProducts.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Package className="size-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-semibold">Mahsulot topilmadi</p>
                  <Button variant="link" className="mt-2 text-blue-600" onClick={() => navigate({ to: '/admin/products' })}>
                    Mahsulot qo'shish
                  </Button>
                </TableCell>
              </TableRow>
            ) : filteredProducts.map(p => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate({ to: '/admin/products' })}>
                <TableCell className="font-bold text-gray-700">{p.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Package className="size-4 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-900">{p.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 max-w-xs truncate">
                  {p.description || '-'}
                </TableCell>
                <TableCell>
                  <span style={{
                    backgroundColor:
                      p.quantity === -1 ? '#f3e8ff' :
                      p.quantity === 0 ? '#fee2e2' :
                      p.quantity < 10 ? '#fef9c3' : '#dcfce7',
                    color:
                      p.quantity === -1 ? '#6b21a8' :
                      p.quantity === 0 ? '#991b1b' :
                      p.quantity < 10 ? '#854d0e' : '#166534'
                  }} className="inline-flex px-3 py-1 rounded-full text-xs font-bold">
                    {p.quantity === -1 ? '∞ Cheksiz' : p.quantity === 0 ? 'Tugangan' : `${p.quantity} dona`}
                  </span>
                </TableCell>
                <TableCell className="font-bold text-green-600">{formatPrice(p.price)}</TableCell>
                <TableCell>
                  <span style={{
                    backgroundColor: p.is_active ? '#dcfce7' : '#f3f4f6',
                    color: p.is_active ? '#166534' : '#374151'
                  }} className="inline-flex px-3 py-1 rounded-full text-xs font-bold">
                    {p.is_active ? 'Faol' : 'Faol emas'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}