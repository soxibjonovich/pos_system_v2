import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { API_URL } from '@/config'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"

const PRODUCTS_API = `${API_URL}:8002/products`

interface Product {
  id: number | string
  name?: string
  title?: string
  price?: number | string
  cost?: number | string
  category?: string
  description?: string
  stock?: number
  quantity?: number
  status?: string
  [key: string]: any
}

interface ProductFormData {
  title: string
  description: string
  quantity: number
  price: number
  cost: number
}

export const Route = createFileRoute('/admin/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { token } = useAuth()
  
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'name' | 'category' | 'status' | 'description'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    quantity: 0,
    price: 0,
    cost: 0,
  })

  const fetchProducts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(PRODUCTS_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`)
      }

      const data = await response.json()
      const productsList = Array.isArray(data) ? data : (data.products || data.data || [])
      setProducts(productsList)
      setFilteredProducts(productsList)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [token])

  useEffect(() => {
    let filtered = [...products]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((product) => {
        const name = (product.name || product.title || '').toLowerCase()
        const description = (product.description || '').toLowerCase()
        const category = (product.category || '').toLowerCase()
        const status = (product.status || '').toLowerCase()

        switch (searchField) {
          case 'name':
            return name.includes(query)
          case 'category':
            return category.includes(query)
          case 'status':
            return status.includes(query)
          case 'description':
            return description.includes(query)
          default:
            return name.includes(query) || description.includes(query) || 
                   category.includes(query) || status.includes(query)
        }
      })
    }

    if (categoryFilter) {
      filtered = filtered.filter((product) => 
        (product.category || '').toLowerCase() === categoryFilter.toLowerCase()
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((product) => 
        (product.status || '').toLowerCase() === statusFilter.toLowerCase()
      )
    }

    setFilteredProducts(filtered)
  }, [searchQuery, searchField, categoryFilter, statusFilter, products])

  const addProduct = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(PRODUCTS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Failed to add product: ${response.statusText}`)
      }

      await fetchProducts()
      setIsAddModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error adding product:', err)
      alert(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateProduct = async (id: number | string, data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${PRODUCTS_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Failed to update product: ${response.statusText}`)
      }

      await fetchProducts()
      setIsEditModalOpen(false)
      setSelectedProduct(null)
      resetForm()
    } catch (err) {
      console.error('Error updating product:', err)
      alert(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteProduct = async (id: number | string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${PRODUCTS_API}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete product: ${response.statusText}`)
      }

      await fetchProducts()
      setIsEditModalOpen(false)
      setSelectedProduct(null)
    } catch (err) {
      console.error('Error deleting product:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      quantity: 0,
      price: 0,
      cost: 0,
    })
  }

  const handleAddClick = () => {
    resetForm()
    setIsAddModalOpen(true)
  }

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      title: product.title || product.name || '',
      description: product.description || '',
      quantity: product.quantity || product.stock || 0,
      price: Number(product.price) || 0,
      cost: Number(product.cost) || 0,
    })
    setIsEditModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditModalOpen && selectedProduct) {
      updateProduct(selectedProduct.id, formData)
    } else {
      addProduct(formData)
    }
  }

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const statuses = Array.from(new Set(products.map(p => p.status).filter(Boolean)))

  const getProductKeys = (): string[] => {
    if (products.length === 0) return ['id', 'name', 'price', 'category', 'stock']
    const firstProduct = products[0]
    const commonFields = ['id', 'name', 'title', 'price', 'cost', 'category', 'stock', 'quantity', 'status', 'description']
    const keys = Object.keys(firstProduct)
    const orderedKeys = [
      ...commonFields.filter(k => keys.includes(k)),
      ...keys.filter(k => !commonFields.includes(k))
    ]
    return orderedKeys.slice(0, 6)
  }

  const productKeys = getProductKeys()

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={handleAddClick}>
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as typeof searchField)}
            className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All fields</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
            <option value="description">Description</option>
          </select>
        </div>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        {statuses.length > 0 && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}

        {(searchQuery || categoryFilter || statusFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('')
              setStatusFilter('')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {filteredProducts.length === 0
              ? 'No products found'
              : `Showing ${filteredProducts.length} of ${products.length} products`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              {productKeys.map((key) => (
                <TableHead key={key} className="capitalize">
                  {key.replace(/_/g, ' ')}
                </TableHead>
              ))}
              <TableHead className="w-0 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={productKeys.length + 1} className="text-center text-muted-foreground">
                  No products match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  {productKeys.map((key) => (
                    <TableCell key={key}>
                      {key === 'price' || key === 'cost' ? (
                        typeof product[key] === 'number' ? `$${product[key].toFixed(2)}` : formatValue(product[key])
                      ) : key === 'quantity' || key === 'stock' ? (
                        product[key] === -1 ? '∞' : formatValue(product[key])
                      ) : (
                        formatValue(product[key])
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(product)}
                      aria-label={`Edit product ${product.name || product.title || product.id}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the product details below. Set quantity to -1 for unlimited stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Product name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">
                    Quantity *
                    <span className="text-xs text-muted-foreground block">(-1 = ∞)</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Cost *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below. Set quantity to -1 for unlimited stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Product name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantity">
                    Quantity *
                    <span className="text-xs text-muted-foreground block">(-1 = ∞)</span>
                  </Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">Price *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-cost">Cost *</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => selectedProduct && deleteProduct(selectedProduct.id)}
                disabled={isSubmitting}
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Product'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}