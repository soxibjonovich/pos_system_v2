import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { API_URL } from '@/config'
import { useAuth } from '@/contexts/auth-context'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const USERS_API = `${API_URL}:8002/users`

interface User {
  id: number | string
  username: string
  full_name: string
  status: string
}

interface UserFormData {
  username: string
  full_name: string
  status: string
}

export const Route = createFileRoute('/admin/users/')({
  component: UsersPage,
})

function UsersPage() {
  const { token } = useAuth()

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    full_name: '',
    status: 'active',
  })

  /* ===================== FETCH USERS ===================== */
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(USERS_API, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (!res.ok) throw new Error('Failed to fetch users')

      const data = await res.json()
      setUsers(data)
      setFilteredUsers(data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [token])

  /* ===================== FILTER ===================== */
  useEffect(() => {
    let list = [...users]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q),
      )
    }

    if (statusFilter) {
      list = list.filter((u) => u.status === statusFilter)
    }

    setFilteredUsers(list)
  }, [search, statusFilter, users])

  /* ===================== CRUD ===================== */
  const resetForm = () => {
    setFormData({ username: '', full_name: '', status: 'active' })
  }

  const addUser = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(USERS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error()

      await fetchUsers()
      setIsAddOpen(false)
      resetForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateUser = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`${USERS_API}/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error()

      await fetchUsers()
      setIsEditOpen(false)
      setSelectedUser(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteUser = async () => {
    if (!selectedUser) return
    if (!confirm('Delete this user?')) return

    await fetch(`${USERS_API}/${selectedUser.id}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    await fetchUsers()
    setIsEditOpen(false)
  }

  /* ===================== UI ===================== */
  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading users...</p>
  }

  if (error) {
    return <p className="p-6 text-destructive">{error}</p>
  }

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search username or full name"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            Showing {filteredUsers.length} of {users.length} users
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell className="capitalize">{user.status}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedUser(user)
                      setFormData(user)
                      setIsEditOpen(true)
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={() => {
        setIsAddOpen(false)
        setIsEditOpen(false)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditOpen ? 'Edit User' : 'Add User'}
            </DialogTitle>
            <DialogDescription>
              Manage user account details
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({ ...formData, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {isEditOpen && (
              <Button variant="destructive" onClick={deleteUser}>
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              onClick={isEditOpen ? updateUser : addUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
