import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { createFileRoute } from '@tanstack/react-router'
import { Package, Pencil, Plus, Search, Tag, Trash2, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

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

interface Category {
  id: number
  name: string
  is_active: boolean
}

interface ProductFormData {
  title: string
  description: string
  category_id: number | null
  quantity: number
  price: number
  is_active: boolean
}

const PRODUCTS_URL = `${api.admin.base}/${api.admin.products}`
const CATEGORIES_URL = `${api.admin.base}/${api.admin.categories}`

const formatPrice = (n: number) => `${Math.floor(n).toLocaleString('uz-UZ')} so'm`

export const Route = createFileRoute('/admin/products/')({
  component: () => (
    <AuthGuard allowedRoles={['admin']}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { token } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    category_id: null,
    quantity: 0,
    price: 0,
    is_active: true,
  })

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }), [token])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(PRODUCTS_URL, { headers: headers() }),
        fetch(CATEGORIES_URL, { headers: headers() })
      ])
      if (!prodRes.ok || !catRes.ok) throw new Error('Yuklanish xatosi')

      const prodData = await prodRes.json()
      const catData = await catRes.json()
      const products = prodData.products || []

      setProducts(products)
      setCategories(catData.categories || [])
      setFilteredProducts(products)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchData()
  }, [fetchData])

  useEffect(() => {
    let filtered = [...products]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    }
    if (categoryFilter) filtered = filtered.filter(p => p.category_id === parseInt(categoryFilter))
    if (statusFilter) filtered = filtered.filter(p => (p.is_active ? 'active' : 'inactive') === statusFilter)
    setFilteredProducts(filtered)
  }, [searchQuery, categoryFilter, statusFilter, products])

  const addProduct = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(PRODUCTS_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category_id: formData.category_id,
          quantity: formData.quantity,
          price: formData.price,
          is_active: formData.is_active,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Qo\'shish xatosi')
      }
      await fetchData()
      setAddModal(false)
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateProduct = async () => {
    if (!selectedProduct) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${PRODUCTS_URL}/${selectedProduct.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          category_id: formData.category_id ? Number(formData.category_id) : null,
          quantity: formData.quantity,
          price: formData.price,
          is_active: formData.is_active,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Yangilash xatosi')
      }
      await fetchData()
      setEditModal(false)
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteProduct = async () => {
    if (!selectedProduct) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${PRODUCTS_URL}/${selectedProduct.id}`, {
        method: 'DELETE',
        headers: headers()
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'O\'chish xatosi')
      }
      await fetchData()
      setDeleteConfirm(false)
      setEditModal(false)
      setSelectedProduct(null)
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => setFormData({ title: '', description: '', category_id: null, quantity: 0, price: 0, is_active: true })

  const openAdd = () => { resetForm(); setAddModal(true) }

  const openEdit = (p: Product) => {
    setSelectedProduct(p)
    setFormData({ title: p.title, description: p.description || '', category_id: p.category_id, quantity: p.quantity, price: p.price, is_active: p.is_active })
    setEditModal(true)
  }

  const getCategoryName = (id: number | null) => {
    if (!id) return '-'
    return categories.find(c => c.id === id)?.name || '-'
  }

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="size-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <Button onClick={fetchData}><RefreshCw className="size-4 mr-2" />Qayta yuklash</Button>
        </div>
      </div>
    )
  }

  const FormFields = ({ prefix = '' }) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}title`}>Mahsulot nomi *</Label>
        <Input id={`${prefix}title`} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="Mahsulot nomi" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}category`}>Kategoriya</Label>
        <select id={`${prefix}category`} value={formData.category_id || ''} onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">Kategoriya yo'q</option>
          {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}desc`}>Tavsif</Label>
        <Textarea id={`${prefix}desc`} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mahsulot tavsifi" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}qty`}>
            Miqdor *
            <span className="text-xs text-gray-400 block">(-1 = cheksiz)</span>
          </Label>
          <Input id={`${prefix}qty`} type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}price`}>Narx (so'm) *</Label>
          <Input id={`${prefix}price`} type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required placeholder="12000" />
        </div>
      </div>
      {formData.price > 0 && (
        <p className="text-sm text-gray-500">Narx: <span className="font-semibold text-green-600">{formatPrice(formData.price)}</span></p>
      )}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input type="checkbox" id={`${prefix}active`} checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="size-4 rounded border-gray-300" />
        <Label htmlFor={`${prefix}active`} className="cursor-pointer">Mahsulot faol</Label>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Mahsulotlar</h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-semibold">{products.length} ta</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData}><RefreshCw className="size-4 mr-2" />Yangilash</Button>
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="size-4 mr-2" />Mahsulot qo'shish
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input type="text" placeholder="Mahsulot qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-11 rounded-md border px-4 text-sm bg-white text-gray-900">
          <option value="">Barcha kategoriyalar</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-md border px-4 text-sm bg-white text-gray-900">
          <option value="">Barcha holatlar</option>
          <option value="active">Faol</option>
          <option value="inactive">Faol emas</option>
        </select>
        {(searchQuery || categoryFilter || statusFilter) && (
          <Button variant="outline" onClick={() => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter('') }}>Tozalash</Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
        <Table>
          <TableCaption className="py-3 text-gray-500">
            {!filteredProducts.length ? 'Mahsulot topilmadi' : `${filteredProducts.length} / ${products.length} ta mahsulot ko'rsatilmoqda`}
          </TableCaption>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#f9fafb' }}>
              <TableHead className="font-bold text-gray-900">#</TableHead>
              <TableHead className="font-bold text-gray-900">Mahsulot</TableHead>
              <TableHead className="font-bold text-gray-900">Kategoriya</TableHead>
              <TableHead className="font-bold text-gray-900">Tavsif</TableHead>
              <TableHead className="font-bold text-gray-900">Ombor</TableHead>
              <TableHead className="font-bold text-gray-900">Narx</TableHead>
              <TableHead className="font-bold text-gray-900">Holat</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Amal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredProducts.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <Package className="size-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-semibold">Mahsulot topilmadi</p>
                  <Button variant="link" className="mt-2 text-blue-600" onClick={openAdd}>Mahsulot qo'shish</Button>
                </TableCell>
              </TableRow>
            ) : filteredProducts.map(p => (
              <TableRow key={p.id} className="hover:bg-gray-50">
                <TableCell className="font-bold text-gray-700">{p.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg"><Package className="size-4 text-blue-600" /></div>
                    <span className="font-semibold text-gray-900">{p.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {p.category_id ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                      <Tag className="size-3 mr-1" />{getCategoryName(p.category_id)}
                    </span>
                  ) : <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell className="text-gray-500 max-w-xs truncate">{p.description || '-'}</TableCell>
                <TableCell>
                  <span style={{
                    backgroundColor: p.quantity === -1 ? '#f3e8ff' : p.quantity === 0 ? '#fee2e2' : p.quantity < 10 ? '#fef9c3' : '#dcfce7',
                    color: p.quantity === -1 ? '#6b21a8' : p.quantity === 0 ? '#991b1b' : p.quantity < 10 ? '#854d0e' : '#166534'
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
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-5 text-blue-600" />Mahsulot qo'shish
            </DialogTitle>
            <DialogDescription>Mahsulot ma'lumotlarini kiriting. Miqdorni -1 qilib cheksiz ombor qo'rtirish mumkin.</DialogDescription>
          </DialogHeader>
          <FormFields prefix="add-" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Bekor</Button>
            <Button onClick={addProduct} disabled={isSubmitting || !formData.title || formData.price <= 0} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? <><RefreshCw className="size-4 mr-2 animate-spin" />Qo'shilmoqda...</> : 'Qo\'shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-blue-600" />Mahsulotni tahrirlash
            </DialogTitle>
            <DialogDescription>Mahsulot #{selectedProduct?.id} ma'lumotlarini o'zgartiring</DialogDescription>
          </DialogHeader>
          <FormFields prefix="edit-" />
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={() => setDeleteConfirm(true)} disabled={isSubmitting}>
              <Trash2 className="size-4 mr-2" />O'chish
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditModal(false)}>Bekor</Button>
              <Button onClick={updateProduct} disabled={isSubmitting || !formData.title || formData.price <= 0}>
                {isSubmitting ? <><RefreshCw className="size-4 mr-2 animate-spin" />Yangilanmoqda...</> : 'Saqlash'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />Mahsulotni o'chish
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-900">"{selectedProduct?.title}"</span> mahsulotini haqiqatdan o'chish istaysiz? Bu amal qaytarilmas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Bekor</Button>
            <Button variant="destructive" onClick={deleteProduct} disabled={isSubmitting}>
              {isSubmitting ? <><RefreshCw className="size-4 mr-2 animate-spin" />O'chilmoqda...</> : 'Ha, o\'chish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}