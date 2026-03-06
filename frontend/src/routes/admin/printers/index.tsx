import { API_URL, api } from "@/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthGuard } from "@/middlewares/AuthGuard";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CategoryItem = {
  id: number;
  name: string;
  is_active: boolean;
};

type PrinterItem = {
  id: number;
  name: string;
  host: string;
  port: number;
  categories: string[];
  created_at: string;
};

type PrinterForm = {
  name: string;
  host: string;
  port: string;
  categories: string[];
};

const isValidHost = (value: string) => {
  const host = value.trim();
  if (!host) return false;
  // Accept IPv4 or hostname.
  const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const hostname = /^[a-zA-Z0-9.-]+$/;
  return ipv4.test(host) || hostname.test(host);
};

export const Route = createFileRoute("/admin/printers/")({
  component: () => (
    <AuthGuard allowedRoles={["admin"]}>
      <PrintersPage />
    </AuthGuard>
  ),
});

function PrintersPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [printers, setPrinters] = useState<PrinterItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<PrinterForm>({
    name: "",
    host: "",
    port: "9100",
    categories: [],
  });

  useEffect(() => {
    const token = localStorage.getItem("postoken") || "";

    const fetchPrinters = async () => {
      try {
        const response = await fetch(
          `${API_URL}${api.admin.base}/${api.admin.printers}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) return;
        const data = await response.json();
        const rawPrinters = Array.isArray(data?.printers) ? data.printers : [];
        setPrinters(rawPrinters);
      } catch {
        setPrinters([]);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch(
          `${API_URL}${api.admin.base}/${api.admin.categories}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) return;
        const data = await response.json();
        const rawCategories = Array.isArray(data?.categories)
          ? data.categories
          : Array.isArray(data)
            ? data
            : [];
        setCategories(rawCategories.filter((c) => c?.is_active !== false));
      } catch {
        setCategories([]);
      }
    };
    fetchPrinters();
    fetchCategories();
  }, []);

  const sortedPrinters = useMemo(
    () =>
      [...printers].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [printers],
  );

  const resetForm = () => {
    setForm({ name: "", host: "", port: "9100", categories: [] });
    setIsEditing(false);
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: PrinterItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setForm({
      name: item.name,
      host: item.host,
      port: String(item.port),
      categories: item.categories || [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const host = form.host.trim();
    const port = Number(form.port);
    const selectedCategories = Array.from(
      new Set(form.categories.map((c) => c.trim()).filter(Boolean)),
    );

    if (!name) {
      alert("Printer nomini kiriting");
      return;
    }
    if (!isValidHost(host)) {
      alert("IP yoki host noto'g'ri");
      return;
    }
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      alert("Port 1..65535 oralig'ida bo'lishi kerak");
      return;
    }
    if (!selectedCategories.length) {
      alert("Kamida bitta kategoriya tanlang");
      return;
    }

    const token = localStorage.getItem("postoken") || "";

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        host,
        port,
        categories: selectedCategories,
        is_active: true,
      };
      const url =
        isEditing && editingId
          ? `${API_URL}${api.admin.base}/${api.admin.printers}/${editingId}`
          : `${API_URL}${api.admin.base}/${api.admin.printers}`;
      const method = isEditing && editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(String(err?.detail || "Saqlashda xatolik"));
      }

      const saved = await response.json();
      if (isEditing && editingId) {
        setPrinters((prev) =>
          prev.map((p) => (p.id === editingId ? saved : p)),
        );
      } else {
        setPrinters((prev) => [saved, ...prev]);
      }

      setModalOpen(false);
      resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Printerni o'chirasizmi?")) return;
    const token = localStorage.getItem("postoken") || "";
    try {
      const response = await fetch(
        `${API_URL}${api.admin.base}/${api.admin.printers}/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(String(err?.detail || "O'chirishda xatolik"));
      }
      setPrinters((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  };

  const toggleCategory = (name: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(name);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== name)
          : [...prev.categories, name],
      };
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="size-6 text-blue-600" />
          <h1 className="text-2xl font-bold">IP Printers</h1>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4 mr-2" />
          Yangi printer
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableCaption>
            {sortedPrinters.length === 0
              ? "Printer qo'shilmagan"
              : `${sortedPrinters.length} ta printer`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>IP / Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Kategoriyalar</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPrinters.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Hali printer qo'shilmagan
                </TableCell>
              </TableRow>
            ) : (
              sortedPrinters.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell>{p.host}</TableCell>
                  <TableCell>{p.port}</TableCell>
                  <TableCell>
                    {p.categories?.length ? p.categories.join(", ") : "-"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="size-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="size-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Printerni tahrirlash" : "Yangi printer qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Nomi, IP/host, port va kategoriya tanlang
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="printer-name">Nomi *</Label>
              <Input
                id="printer-name"
                value={form.name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Salats"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="printer-host">IP / Host *</Label>
              <Input
                id="printer-host"
                value={form.host}
                onChange={(e) =>
                  setForm((s) => ({ ...s, host: e.target.value }))
                }
                placeholder="192.168.1.120"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="printer-port">Port *</Label>
              <Input
                id="printer-port"
                type="number"
                value={form.port}
                onChange={(e) =>
                  setForm((s) => ({ ...s, port: e.target.value }))
                }
                placeholder="9100"
                min="1"
                max="65535"
              />
            </div>
            <div className="grid gap-2">
              <Label>Kategoriyalar *</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Kategoriya topilmadi
                  </p>
                ) : (
                  categories.map((category) => {
                    const checked = form.categories.includes(category.name);
                    return (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(category.name)}
                        />
                        <span>{category.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Bekor
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isEditing ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
