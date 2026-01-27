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
import { API_URL } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Package, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
  
  const CATEGORIES_API = `${API_URL}/api/admin/categories`
  const PRODUCTS_API = `${API_URL}/api/admin/products`
  
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
    name: string
    description: string | null
    category_id: number | null
    quantity: number
    price: number
    cost: number
    is_active: boolean
    created_at: string
    updated_at: string | null
  }
  
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
  
    useEffect(() => {
      if (token) {
        fetchCategoryAndProducts()
      }
    }, [categoryId, token])
  
    useEffect(() => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const filtered = products.filter(p => 
          p.title.toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query)
        )
        setFilteredProducts(filtered)
      } else {
        setFilteredProducts(products)
      }
    }, [searchQuery, products])
  
    const fetchCategoryAndProducts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Fetch category details
        const categoryResponse = await fetch(`${CATEGORIES_API}/${categoryId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
  
        if (!categoryResponse.ok) {
          throw new Error('Category not found')
        }
  
        const categoryData = await categoryResponse.json()
        setCategory(categoryData)
  
        // Fetch all products
        const productsResponse = await fetch(PRODUCTS_API, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })
  
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products')
        }
  
        const productsData = await productsResponse.json()
        const allProducts = productsData.products || []
        console.log(allProducts)
        
        // Filter products by category
        const categoryProducts = allProducts.filter(
          (p: Product) => p.category_id === parseInt(categoryId)
        )
        
        setProducts(categoryProducts)
        setFilteredProducts(categoryProducts)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setIsLoading(false)
      }
    }
  
    const handleProductClick = (productId: number) => {
      navigate({ to: '/admin/products' })
      // You could also navigate to a product detail page if you have one
    }
  
    if (isLoading) {
      return (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    }
  
    if (error || !category) {
      return (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">Error: {error || 'Category not found'}</p>
              <Button onClick={() => navigate({ to: '/admin/categories' })}>
                Back to Categories
              </Button>
            </div>
          </div>
        </div>
      )
    }
  
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/admin/categories' })}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{category.name}</h1>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {category.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>
        </div>
  
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products in this category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear
            </Button>
          )}
        </div>
  
        <div className="border rounded-lg">
          <Table>
            <TableCaption>
              {filteredProducts.length === 0
                ? 'No products in this category'
                : `Showing ${filteredProducts.length} of ${products.length} products`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <Package className="size-12 mx-auto mb-2 opacity-20" />
                    <p>No products found in this category</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => navigate({ to: '/admin/products' })}
                    >
                      Add products to this category
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow 
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleProductClick(product.id)}
                  >
                    <TableCell>{product.id}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-blue-600" />
                        {product.title}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {product.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        product.quantity === -1 
                          ? 'bg-purple-100 text-purple-800'
                          : product.quantity === 0
                          ? 'bg-red-100 text-red-800'
                          : product.quantity < 10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.quantity === -1 ? '∞ Unlimited' : product.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-green-700">
                      ${product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.cost !== null ? `$${product.cost.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
  
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-muted-foreground">Total Products</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {products.filter(p => p.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {products.filter(p => p.quantity === 0 && p.quantity !== -1).length}
              </div>
              <div className="text-sm text-muted-foreground">Out of Stock</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                ${products.reduce((sum, p) => sum + (p.price * (p.quantity === -1 ? 0 : p.quantity)), 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
          </div>
        </div>
      </div>
    )
  }