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
import { api } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/middlewares/AuthGuard"
import { createFileRoute } from '@tanstack/react-router'
import { Circle, Pencil, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface TableItem {
  id: number
  number: string
  capacity: number | null
  status: 'available' | 'occupied' | 'reserved'
  is_active: boolean
  created_at: string
  updated_at: string | null
}

interface TableFormData {
  number: string
  capacity: number | null
  is_active: boolean
}

const TABLES_URL = `${api.admin.base}/${api.admin.tables}`

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'available':
      return { className: 'bg-green-100 text-green-800', text: 'Bo\'sh' }
    case 'occupied':
      return { className: 'bg-red-100 text-red-800', text: 'Band' }
    case 'reserved':
      return { className: 'bg-yellow-100 text-yellow-800', text: 'Bron' }
    default:
      return { className: 'bg-gray-100 text-gray-800', text: status }
  }
}

export const Route = createFileRoute('/admin/tables/')({
  component: () => (
    <AuthGuard allowedRoles={['admin']}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { token } = useAuth()

  const [tables, setTables] = useState<TableItem[]>([])
  const [filteredTables, setFilteredTables] = useState<TableItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<TableFormData>({
    number: '',
    capacity: null,
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
      const res = await fetch(TABLES_URL, { headers: headers() })
      if (!res.ok) throw new Error('Yuklanish xatosi')

      const data = await res.json()
      const tables = data.tables || []

      setTables(tables)
      setFilteredTables(tables)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsLoading(false)
    }
  }, [token, headers])

  useEffect(() => {
    if (token) fetchData()
  }, [fetchData, token])

  useEffect(() => {
    let filtered = [...tables]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(t => t.number.toLowerCase().includes(q))
    }
    if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter)
    if (activeFilter) filtered = filtered.filter(t => (t.is_active ? 'active' : 'inactive') === activeFilter)
    setFilteredTables(filtered)
  }, [searchQuery, statusFilter, activeFilter, tables])

  const addTable = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(TABLES_URL, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          number: formData.number,
          capacity: formData.capacity,
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

  const updateTable = async () => {
    if (!selectedTable) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${TABLES_URL}/${selectedTable.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          number: formData.number,
          capacity: formData.capacity,
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

  const deleteTable = async () => {
    if (!selectedTable) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${TABLES_URL}/${selectedTable.id}`, {
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
      setSelectedTable(null)
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xato')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => setFormData({ number: '', capacity: null, is_active: true })

  const openAdd = () => { resetForm(); setAddModal(true) }

  const openEdit = (t: TableItem) => {
    setSelectedTable(t)
    setFormData({ number: t.number, capacity: t.capacity, is_active: t.is_active })
    setEditModal(true)
  }

  const stats = {
    available: tables.filter(t => t.status === 'available' && t.is_active).length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  }

  const uniqueStatuses = Array.from(new Set(tables.map(t => t.status)))

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Xato: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Stollar</h1>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
            {tables.length} ta
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="size-4 mr-2" />Yangilash
          </Button>
          <Button onClick={openAdd}>
            <Plus className="size-4 mr-2" />Stol qo'shish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-semibold">Bo'sh stollar</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.available}</p>
            </div>
            <Circle className="size-12 text-green-600" fill="currentColor" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-semibold">Band stollar</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.occupied}</p>
            </div>
            <Circle className="size-12 text-red-600" fill="currentColor" />
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-semibold">Bron qilingan</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.reserved}</p>
            </div>
            <Circle className="size-12 text-yellow-600" fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Stol qidirish..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9" 
          />
        </div>
        
        {uniqueStatuses.length > 0 && (
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Barcha holatlar</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>
                {getStatusConfig(status).text}
              </option>
            ))}
          </select>
        )}

        <select 
          value={activeFilter} 
          onChange={(e) => setActiveFilter(e.target.value)} 
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Barcha</option>
          <option value="active">Faol</option>
          <option value="inactive">Faol emas</option>
        </select>

        {(searchQuery || statusFilter || activeFilter) && (
          <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter(''); setActiveFilter('') }}>
            Tozalash
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {filteredTables.length === 0
              ? 'Stol topilmadi'
              : `${filteredTables.length} / ${tables.length} ta stol ko'rsatilmoqda`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Stol raqami</TableHead>
              <TableHead>Sig'im</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Faollik</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Filtrlarga mos stol topilmadi
                </TableCell>
              </TableRow>
            ) : (
              filteredTables.map(t => {
                const statusConfig = getStatusConfig(t.status)
                return (
                  <TableRow 
                    key={t.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(t)}
                  >
                    <TableCell className="font-medium">#{t.id}</TableCell>
                    <TableCell className="font-semibold">{t.number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.capacity ? `${t.capacity} odam` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.className}`}>
                        <Circle className="size-2 mr-1.5" fill="currentColor" />
                        {statusConfig.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {t.is_active ? 'Faol' : 'Faol emas'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); openEdit(t) }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-blue-600" />Stol qo'shish
            </DialogTitle>
            <DialogDescription>Yangi stol ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-number">Stol raqami *</Label>
              <Input 
                id="add-number" 
                value={formData.number} 
                onChange={(e) => setFormData({ ...formData, number: e.target.value })} 
                placeholder="1 yoki T1" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-capacity">
                Sig'im (odamlar soni)
                <span className="text-xs text-muted-foreground block">Bo'sh qoldirish mumkin</span>
              </Label>
              <Input 
                id="add-capacity" 
                type="number" 
                value={formData.capacity || ''} 
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? Number(e.target.value) : null })} 
                placeholder="4" 
                min="1"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <input 
                type="checkbox" 
                id="add-active" 
                checked={formData.is_active} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
                className="size-4 rounded border-input" 
              />
              <Label htmlFor="add-active" className="cursor-pointer">Stol faol</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Bekor</Button>
            <Button onClick={addTable} disabled={isSubmitting || !formData.number}>
              {isSubmitting ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-blue-600" />Stolni tahrirlash
            </DialogTitle>
            <DialogDescription>Stol #{selectedTable?.id} ma'lumotlarini o'zgartiring</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-number">Stol raqami *</Label>
              <Input 
                id="edit-number" 
                value={formData.number} 
                onChange={(e) => setFormData({ ...formData, number: e.target.value })} 
                placeholder="1 yoki T1" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-capacity">
                Sig'im (odamlar soni)
                <span className="text-xs text-muted-foreground block">Bo'sh qoldirish mumkin</span>
              </Label>
              <Input 
                id="edit-capacity" 
                type="number" 
                value={formData.capacity || ''} 
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? Number(e.target.value) : null })} 
                placeholder="4" 
                min="1"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <input 
                type="checkbox" 
                id="edit-active" 
                checked={formData.is_active} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
                className="size-4 rounded border-input" 
              />
              <Label htmlFor="edit-active" className="cursor-pointer">Stol faol</Label>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={() => setDeleteConfirm(true)} disabled={isSubmitting}>
              <Trash2 className="size-4 mr-2" />O'chish
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditModal(false)}>Bekor</Button>
              <Button onClick={updateTable} disabled={isSubmitting || !formData.number}>
                {isSubmitting ? 'Yangilanmoqda...' : 'Saqlash'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />Stolni o'chish
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold">"{selectedTable?.number}"</span> stolini haqiqatdan o'chish istaysiz? Bu amal qaytarilmas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Bekor</Button>
            <Button variant="destructive" onClick={deleteTable} disabled={isSubmitting}>
              {isSubmitting ? 'O\'chilmoqda...' : 'Ha, o\'chish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}