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
import { API_URL } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { useI18n } from "@/i18n"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const CATEGORIES_API = `${API_URL}/api/admin/categories`

interface Category {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

interface CategoryFormData {
  name: string
  description: string | null
  is_active: boolean
}

export const Route = createFileRoute('/admin/categories/')({
  component: () => (
    <AuthGuard allowedRoles={['admin']}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { t } = useI18n()
  const { token } = useAuth()
  const navigate = useNavigate()
  
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    is_active: true,
  })

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(CATEGORIES_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
      }

      const data = await response.json()
      const categoriesList = data.categories || []
      setCategories(categoriesList)
      setFilteredCategories(categoriesList)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchCategories()
    }
  }, [token])

  useEffect(() => {
    let filtered = [...categories]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((category) => {
        const name = category.name.toLowerCase()
        const description = (category.description || '').toLowerCase()
        return name.includes(query) || description.includes(query)
      })
    }

    if (statusFilter) {
      filtered = filtered.filter((category) => {
        const isActive = category.is_active ? 'active' : 'inactive'
        return isActive === statusFilter
      })
    }

    setFilteredCategories(filtered)
  }, [searchQuery, statusFilter, categories])

  const addCategory = async (data: CategoryFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(CATEGORIES_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to add category: ${response.statusText}`)
      }

      await fetchCategories()
      setIsAddModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error adding category:', err)
      alert(err instanceof Error ? err.message : t('admin.categories.failedAdd'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateCategory = async (id: number, data: Partial<CategoryFormData>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`${CATEGORIES_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to update category: ${response.statusText}`)
      }

      await fetchCategories()
      setIsEditModalOpen(false)
      setSelectedCategory(null)
      resetForm()
    } catch (err) {
      console.error('Error updating category:', err)
      alert(err instanceof Error ? err.message : t('admin.categories.failedUpdate'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteCategory = async (id: number) => {
    if (!confirm(t('admin.categories.deleteConfirm'))) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${CATEGORIES_API}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to delete category: ${response.statusText}`)
      }

      await fetchCategories()
      setIsEditModalOpen(false)
      setSelectedCategory(null)
    } catch (err) {
      console.error('Error deleting category:', err)
      alert(err instanceof Error ? err.message : t('admin.categories.failedDelete'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
    })
  }

  const handleAddClick = () => {
    resetForm()
    setIsAddModalOpen(true)
  }

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
    })
    setIsEditModalOpen(true)
  }

  const handleCategoryClick = (categoryId: number) => {
    navigate({ to: '/admin/categories/$categoryId', params: { categoryId: String(categoryId) } })
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addCategory(formData)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return
    updateCategory(selectedCategory.id, formData)
  }

  const statuses = ['active', 'inactive']

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('admin.categories.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{t('admin.categories.error')}: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="size-6 text-orange-600" />
          <h1 className="text-2xl font-bold">{t('admin.categories.title')}</h1>
        </div>
        <Button onClick={handleAddClick} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="size-4" />
          {t('admin.categories.addButton')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('admin.categories.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t('admin.categories.allStatuses')}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`admin.categories.${status}`)}
            </option>
          ))}
        </select>

        {(searchQuery || statusFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('')
            }}
          >
            {t('admin.categories.clearFilters')}
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {filteredCategories.length === 0
              ? t('admin.categories.noCategoriesFound')
              : t('admin.categories.showing', { filtered: filteredCategories.length, total: categories.length })}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.categories.id')}</TableHead>
              <TableHead>{t('admin.categories.name')}</TableHead>
              <TableHead>{t('admin.categories.description')}</TableHead>
              <TableHead>{t('admin.categories.status')}</TableHead>
              <TableHead>{t('admin.categories.created')}</TableHead>
              <TableHead className="w-0 text-right">{t('admin.categories.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('admin.categories.noMatch')}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell onClick={() => handleCategoryClick(category.id)}>{category.id}</TableCell>
                  <TableCell 
                    onClick={() => handleCategoryClick(category.id)}
                    className="font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 text-orange-600" />
                      {category.name}
                    </div>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleCategoryClick(category.id)}
                    className="max-w-xs truncate text-muted-foreground"
                  >
                    {category.description || '-'}
                  </TableCell>
                  <TableCell onClick={() => handleCategoryClick(category.id)}>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {t(`admin.categories.${category.is_active ? 'active' : 'inactive'}`)}
                    </span>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleCategoryClick(category.id)}
                    className="text-sm text-muted-foreground"
                  >
                    {new Date(category.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClick(category)
                      }}
                      aria-label="Edit category"
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
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5 text-orange-600" />
              {t('admin.categories.addTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.categories.addDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('admin.categories.nameLabel')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('admin.categories.namePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">{t('admin.categories.descLabel')}</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                  placeholder={t('admin.categories.descPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="size-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  {t('admin.categories.isActive')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {isSubmitting ? t('admin.categories.adding') : t('admin.categories.addSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('admin.categories.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.categories.editDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t('admin.categories.nameLabel')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('admin.categories.namePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">{t('admin.categories.descLabel')}</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
                  placeholder={t('admin.categories.descPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="size-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-is_active" className="cursor-pointer">
                  {t('admin.categories.isActive')}
                </Label>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => selectedCategory && deleteCategory(selectedCategory.id)}
                disabled={isSubmitting}
              >
                <Trash2 className="size-4 mr-2" />
                {t('admin.categories.deleteButton')}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('admin.categories.updating') : t('admin.categories.updateSubmit')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}