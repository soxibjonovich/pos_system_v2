import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, Shield } from 'lucide-react'
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
import { useAuth } from "@/contexts/auth-context"

interface User {
  id: number
  username: string
  full_name: string
  pin: number
  role: string
  status: string
  last_login?: string | null
}

interface UserFormData {
  username: string
  full_name: string
  pin: number
}

interface UserUpdateData {
  full_name?: string
  pin?: number
  role?: string
  status?: string
}

export const Route = createFileRoute('/admin/users/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'username' | 'full_name' | 'role'>('all')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { token } = useAuth()

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form data
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    full_name: '',
    pin: 1000,
  })

  // Edit form data
  const [editFormData, setEditFormData] = useState<UserUpdateData & { role: string; status: string }>({
    full_name: '',
    pin: 1000,
    role: 'cashier',
    status: 'active',
  })

  // Fetch users from API
  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('http://127.0.0.1:8001/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [token])

  // Apply filters and search
  useEffect(() => {
    let filtered = [...users]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((user) => {
        const username = user.username.toLowerCase()
        const fullName = user.full_name.toLowerCase()
        const role = user.role.toLowerCase()

        switch (searchField) {
          case 'username':
            return username.includes(query)
          case 'full_name':
            return fullName.includes(query)
          case 'role':
            return role.includes(query)
          default:
            return username.includes(query) || fullName.includes(query) || role.includes(query)
        }
      })
    }

    if (roleFilter) {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, searchField, roleFilter, statusFilter, users])

  // API Functions
  const addUser = async (data: UserFormData, isAdmin: boolean = false) => {
    setIsSubmitting(true)
    try {
      const endpoint = isAdmin ? 'http://127.0.0.1:8001/users/admin' : 'http://127.0.0.1:8001/users'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to add user: ${response.statusText}`)
      }

      await fetchUsers()
      setIsAddModalOpen(false)
      setIsAddAdminModalOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error adding user:', err)
      alert(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateUser = async (id: number, data: UserUpdateData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`http://127.0.0.1:8001/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      })

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

  const updateUserRole = async (id: number, role: string) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`http://127.0.0.1:8001/users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ role }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to update role: ${response.statusText}`)
      }

      await fetchUsers()
      setIsEditModalOpen(false)
      setSelectedUser(null)
      resetForm()
    } catch (err) {
      console.error('Error updating role:', err)
      alert(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`http://127.0.0.1:8001/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to delete user: ${response.statusText}`)
      }

      await fetchUsers()
      setIsEditModalOpen(false)
      setSelectedUser(null)
    } catch (err) {
      console.error('Error deleting user:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Form handlers
  const resetForm = () => {
    setFormData({
      username: '',
      full_name: '',
      pin: 1000,
    })
    setEditFormData({
      full_name: '',
      pin: 1000,
      role: 'cashier',
      status: 'active',
    })
  }

  const handleAddClick = () => {
    resetForm()
    setIsAddModalOpen(true)
  }

  const handleAddAdminClick = () => {
    resetForm()
    setIsAddAdminModalOpen(true)
  }

  const handleEditClick = (user: User) => {
    setSelectedUser(user)
    setEditFormData({
      full_name: user.full_name,
      pin: user.pin,
      role: user.role,
      status: user.status,
    })
    setIsEditModalOpen(true)
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addUser(formData, false)
  }

  const handleAddAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addUser(formData, true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUser) {
      updateUser(selectedUser.id, editFormData)
    }
  }

  // Get unique roles and statuses for filters
  const roles = Array.from(new Set(users.map(u => u.role).filter(Boolean)))
  const statuses = Array.from(new Set(users.map(u => u.status).filter(Boolean)))

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading users...</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex gap-2">
          <Button onClick={handleAddClick} variant="default">
            <Plus className="size-4" />
            Add User
          </Button>
          <Button onClick={handleAddAdminClick} variant="outline">
            <Shield className="size-4" />
            Add Admin
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users..."
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
            <option value="username">Username</option>
            <option value="full_name">Full Name</option>
            <option value="role">Role</option>
          </select>
        </div>

        {roles.length > 0 && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
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

        {(searchQuery || roleFilter || statusFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('')
              setRoleFilter('')
              setStatusFilter('')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {filteredUsers.length === 0
              ? 'No users found'
              : `Showing ${filteredUsers.length} of ${users.length} users`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No users match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell className="font-mono">****</TableCell>
                  <TableCell>
                    <span className="capitalize inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-600/20">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      user.status === 'active' 
                        ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' 
                        : 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(user)}
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

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. PIN must be 4-6 digits.
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
                  placeholder="johndoe"
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
                <Label htmlFor="pin">
                  PIN *
                  <span className="text-xs text-muted-foreground block">(4-6 digits)</span>
                </Label>
                <Input
                  id="pin"
                  type="number"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: Number(e.target.value) })}
                  required
                  min={1000}
                  max={999999}
                  placeholder="1234"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Admin Modal */}
      <Dialog open={isAddAdminModalOpen} onOpenChange={setIsAddAdminModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Administrator</DialogTitle>
            <DialogDescription>
              Create a new admin account with full system access. PIN must be 4-6 digits.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAdminSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-username">Username *</Label>
                <Input
                  id="admin-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="admin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-full_name">Full Name *</Label>
                <Input
                  id="admin-full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Administrator"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin-pin">
                  PIN *
                  <span className="text-xs text-muted-foreground block">(4-6 digits)</span>
                </Label>
                <Input
                  id="admin-pin"
                  type="number"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: Number(e.target.value) })}
                  required
                  min={1000}
                  max={999999}
                  placeholder="1234"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddAdminModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Administrator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account details. PIN must be 4-6 digits.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-full_name">Full Name *</Label>
                <Input
                  id="edit-full_name"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-pin">
                  PIN *
                  <span className="text-xs text-muted-foreground block">(4-6 digits)</span>
                </Label>
                <Input
                  id="edit-pin"
                  type="number"
                  value={editFormData.pin}
                  onChange={(e) => setEditFormData({ ...editFormData, pin: Number(e.target.value) })}
                  required
                  min={1000}
                  max={999999}
                  placeholder="1234"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role *</Label>
                  <select
                    id="edit-role"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <select
                    id="edit-status"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
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
                  {isSubmitting ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}