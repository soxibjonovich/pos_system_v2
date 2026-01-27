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
import { API_URL } from '@/config'
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from '@/middlewares/AuthGuard'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus, Search, Shield, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const USERS_API = `${API_URL}/api/database/users`
const ADMIN_API = `${API_URL}/api/databse/users/admin`

interface User {
  id: number
  username: string
  full_name: string
  pin: number
  role: string
  status: string
  last_login: string | null
}

interface UserFormData {
  username: string
  full_name: string
  pin: string
}

interface UserUpdateData {
  full_name?: string
  pin?: number
  status?: string
}

export const Route = createFileRoute('/admin/admins/')({
  component: () => (
    <AuthGuard allowedRoles={['admin']}>
      <RouteComponent />
    </AuthGuard>
  ),
})

function RouteComponent() {
  const { token } = useAuth()
  
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    full_name: '',
    pin: '',
  })

  const [editData, setEditData] = useState({
    full_name: '',
    pin: '',
    status: '',
  })

  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(USERS_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()
      const usersList = Array.isArray(data) ? data : (data.users || [])
      
      // Filter only admin users
      const adminUsers = usersList.filter((user: User) => user.role === 'admin')
      
      setUsers(adminUsers)
      setFilteredUsers(adminUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchUsers()
    }
  }, [token])

  useEffect(() => {
    let filtered = [...users]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((user) => {
        const username = user.username.toLowerCase()
        const fullName = user.full_name.toLowerCase()
        return username.includes(query) || fullName.includes(query)
      })
    }

    if (statusFilter) {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, statusFilter, users])

  const addAdmin = async (data: UserFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: data.username,
          full_name: data.full_name,
          pin: parseInt(data.pin, 10),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to add admin: ${response.statusText}`)
      }

      await fetchUsers()
      setIsAddModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error adding admin:', err)
      alert(err instanceof Error ? err.message : 'Failed to add admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateUser = async (id: number, data: UserUpdateData) => {
    setIsSubmitting(true)
    try {
      console.log('Sending update:', data)
      const response = await fetch(`${USERS_API}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to update user: ${response.statusText}`)
      }

      await fetchUsers()
      setIsEditModalOpen(false)
      setSelectedUser(null)
      resetForm()
    } catch (err) {
      console.error('Error updating user:', err)
      alert(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${USERS_API}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to delete admin: ${response.statusText}`)
      }

      await fetchUsers()
      setIsEditModalOpen(false)
      setSelectedUser(null)
    } catch (err) {
      console.error('Error deleting admin:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      full_name: '',
      pin: '',
    })
    setEditData({
      full_name: '',
      pin: '',
      status: '',
    })
  }

  const handleAddClick = () => {
    resetForm()
    setIsAddModalOpen(true)
  }

  const handleEditClick = (user: User) => {
    setSelectedUser(user)
    setEditData({
      full_name: user.full_name,
      pin: String(user.pin),
      status: user.status,
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || isSubmitting) return

    const updateData: UserUpdateData = {}
    if (editData.full_name !== selectedUser.full_name) {
      updateData.full_name = editData.full_name
    }
    if (editData.pin && parseInt(editData.pin) !== selectedUser.pin) {
      updateData.pin = parseInt(editData.pin, 10)
    }
    if (editData.status !== selectedUser.status) {
      updateData.status = editData.status
    }

    console.log('Update data being sent:', updateData)

    if (Object.keys(updateData).length === 0) {
      setIsEditModalOpen(false)
      return
    }

    await updateUser(selectedUser.id, updateData)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addAdmin(formData)
  }

  const statuses = ['active', 'inactive']
  const uniqueStatuses = Array.from(new Set(users.map(u => u.status)))

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading administrators...</p>
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
        <div className="flex items-center gap-2">
          <Shield className="size-6 text-purple-600" />
          <h1 className="text-2xl font-bold">Administrators</h1>
        </div>
        <Button onClick={handleAddClick} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="size-4" />
          Add Administrator
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search administrators..."
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
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}

        {(searchQuery || statusFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
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
            {filteredUsers.length === 0
              ? 'No administrators found'
              : `Showing ${filteredUsers.length} of ${users.length} administrators`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-0 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No administrators match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-purple-600" />
                      {user.username}
                    </div>
                  </TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(user)}
                      aria-label="Edit admin"
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
              <Shield className="size-5 text-purple-600" />
              Add New Administrator
            </DialogTitle>
            <DialogDescription>
              Create a new administrator account. PIN must be 4-6 digits.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="admin_username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pin">PIN Code *</Label>
                <Input
                  id="pin"
                  type="number"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  required
                  min={1000}
                  max={999999}
                  placeholder="4-6 digit PIN"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? 'Adding...' : 'Add Administrator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update administrator information. Leave PIN empty to keep current.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-full_name">Full Name *</Label>
                <Input
                  id="edit-full_name"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-pin">New PIN (optional)</Label>
                <Input
                  id="edit-pin"
                  type="number"
                  value={editData.pin}
                  onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                  min={1000}
                  max={999999}
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => selectedUser && deleteUser(selectedUser.id)}
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
                  {isSubmitting ? 'Updating...' : 'Update Admin'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}