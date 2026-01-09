import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

interface Product {
  id: number | string
  name?: string
  title?: string
  price?: number | string
  category?: string
  description?: string
  stock?: number
  status?: string
  [key: string]: any // Allow for flexible product structure
}

export const Route = createFileRoute('/admin/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'name' | 'category' | 'status' | 'description'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { token } = useAuth()

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('http://127.0.0.1:8002/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        })

        console.log(response);

        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`)
        }

        const data = await response.json()
        // Handle both array and object responses
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

    fetchProducts()
  }, [token])

  // Apply filters and search
  useEffect(() => {
    let filtered = [...products]

    // Apply search filter
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
            return (
              name.includes(query) ||
              description.includes(query) ||
              category.includes(query) ||
              status.includes(query)
            )
        }
      })
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter((product) => {
        const category = (product.category || '').toLowerCase()
        return category === categoryFilter.toLowerCase()
      })
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((product) => {
        const status = (product.status || '').toLowerCase()
        return status === statusFilter.toLowerCase()
      })
    }

    setFilteredProducts(filtered)
  }, [searchQuery, searchField, categoryFilter, statusFilter, products])

  // Get unique categories and statuses for filters
  const categories = Array.from(new Set([]))
  const statuses = Array.from(new Set(products.map(p => p.status).filter(Boolean)))

  // Get product keys for table headers (dynamically based on first product)
  const getProductKeys = (): string[] => {
    if (products.length === 0) return ['id', 'name', 'price', 'category', 'stock']
    const firstProduct = products[0]
    // Prioritize common fields
    const commonFields = ['id', 'name', 'title', 'price', 'category', 'stock', 'status', 'description']
    const keys = Object.keys(firstProduct)
    const orderedKeys = [
      ...commonFields.filter(k => keys.includes(k)),
      ...keys.filter(k => !commonFields.includes(k))
    ]
    return orderedKeys.slice(0, 6) // Limit to 6 columns for readability
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
      {/* Header with Add Product Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/admin/products">
          <Button>
            <Plus className="size-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar with field filter */}
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

        {/* Category Filter */}
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

        {/* Status Filter */}
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

        {/* Clear Filters Button */}
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

      {/* Products Table */}
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
              <TableHead className="w-0 text-right">Edit</TableHead>
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
                      {key === 'price' && typeof product[key] === 'number'
                        ? `$${product[key].toFixed(2)}`
                        : formatValue(product[key])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
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
    </div>
  )
}
