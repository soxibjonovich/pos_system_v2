import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, API_URL } from "@/config";
import { AuthGuard } from "@/middlewares/AuthGuard";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  Edit,
  UtensilsCrossed,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/admin/products/")({
  component: () => (
    <AuthGuard allowedRoles={["admin"]}>
      <ProductsPage />
    </AuthGuard>
  ),
});

const UNITS = [
  { value: "dona", label: "dona" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "l", label: "l" },
  { value: "ml", label: "ml" },
  { value: "porsi", label: "porsi" },
];

interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  unit?: string | null;
  capacity?: number | null;
  category_id?: number | null;
  is_active: boolean;
  image_url?: string;
  image_filename?: string;
  created_at: string;
  updated_at?: string;
}

interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

const resolveImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return `${API_URL}${imageUrl}`;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<number, boolean>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: 0,
    quantity: -1,
    unit: "" as string,
    capacity: "" as string,
    category_id: undefined as number | null | undefined,
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(
        `${API_URL}${api.admin.base}/${api.admin.products}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("postoken")}`,
          },
        },
      );
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `${API_URL}${api.admin.base}/${api.admin.categories}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("postoken")}`,
          },
        },
      );
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Allowed: JPG, PNG, WEBP, GIF");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Maximum size: 5MB");
        return;
      }

      setImageFile(file);
      setRemoveImage(false);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `${API_URL}${api.admin.base}/${api.admin.products}/export`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("postoken")}`,
          },
        },
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch(
        `${API_URL}${api.admin.base}/${api.admin.products}/import`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("postoken")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (response.ok) {
        const result = await response.json();
        await fetchProducts();
        alert(
          `Import complete: ${result.created} created, ${result.updated} updated${result.failed ? `, ${result.failed} failed` : ""}`,
        );
      } else {
        alert("Import failed");
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Invalid JSON file or import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("title", formData.title);
      payload.append("price", String(formData.price));
      payload.append("quantity", String(formData.quantity));
      payload.append("is_active", String(formData.is_active));

      if (formData.unit) {
        payload.append("unit", formData.unit);
      }

      if (formData.capacity) {
        payload.append("capacity", formData.capacity);
      }

      if (formData.description.trim()) {
        payload.append("description", formData.description);
      }

      if (
        typeof formData.category_id === "number" &&
        Number.isInteger(formData.category_id)
      ) {
        payload.append("category_id", String(formData.category_id));
      }

      if (imageFile) {
        payload.append("image", imageFile);
      }

      if (removeImage) {
        payload.append("remove_image", "true");
      }

      const url = editingProduct
        ? `${API_URL}${api.admin.base}/${api.admin.products}/${editingProduct.id}`
        : `${API_URL}${api.admin.base}/${api.admin.products}`;

      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("postoken")}`,
        },
        body: payload,
      });

      if (response.ok) {
        await fetchProducts();
        handleCloseForm();
      } else {
        const error = await response.json().catch(() => ({}));
        const detail = Array.isArray(error?.detail)
          ? error.detail[0]?.msg || "Failed to save product"
          : error?.detail || "Failed to save product";
        alert(`Error: ${detail}`);
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(
        `${API_URL}${api.admin.base}/${api.admin.products}/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("postoken")}`,
          },
        },
      );

      if (response.ok) {
        await fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || "",
      price: product.price,
      quantity: product.quantity,
      unit: product.unit || "",
      capacity: product.capacity != null ? String(product.capacity) : "",
      category_id: product.category_id ?? undefined,
      is_active: product.is_active,
    });
    setImagePreview(resolveImageUrl(product.image_url));
    setImageFile(null);
    setRemoveImage(false);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData({
      title: "",
      description: "",
      price: 0,
      quantity: -1,
      unit: "",
      capacity: "",
      category_id: undefined,
      is_active: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-1">{products.length} total products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} size="lg">
            <Download className="mr-2 size-5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={importing}
            onClick={() => importInputRef.current?.click()}
          >
            {importing ? (
              <>
                <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 size-5" />
                Import
              </>
            )}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button onClick={() => setShowForm(true)} size="lg">
            <Plus className="mr-2 size-5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-black dark:border-gray-900"
          >
            {/* Product Image */}
            {product.image_url &&
            !brokenImageIds[product.id] &&
            resolveImageUrl(product.image_url) ? (
              <img
                src={resolveImageUrl(product.image_url) || undefined}
                alt={product.title}
                className="w-full h-48 object-cover bg-gray-100"
                onError={() =>
                  setBrokenImageIds((prev) => ({ ...prev, [product.id]: true }))
                }
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <UtensilsCrossed className="size-14 text-amber-500/80" />
              </div>
            )}

            {/* Product Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg line-clamp-1 flex-1">
                  {product.title}
                </h3>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    product.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {product.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="mb-3">
                <p className="text-2xl font-bold text-green-600">
                  {product.price.toLocaleString()} so'm
                </p>
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <span
                  className={`font-medium ${
                    product.quantity === -1
                      ? "text-blue-600"
                      : product.quantity === 0
                        ? "text-red-600"
                        : "text-gray-600"
                  }`}
                >
                  {product.quantity === -1
                    ? "∞ Unlimited"
                    : `Stock: ${product.quantity}`}
                  {(product.capacity != null || product.unit) && (
                    <span className="ml-1 text-gray-400">
                      ({product.capacity != null ? product.capacity : ""}
                      {product.unit || ""})
                    </span>
                  )}
                </span>

                {product.category_id && (
                  <span className="text-gray-500">
                    {categories.find((c) => c.id === product.category_id)
                      ?.name || "No Category"}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(product)}
                  className="flex-1"
                >
                  <Edit className="mr-1 size-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="size-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No products found</p>
          {searchQuery && (
            <p className="text-gray-400 text-sm mt-2">
              Try adjusting your search
            </p>
          )}
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Image
              </label>
              {imagePreview ? (
                <div className="relative w-full h-64 border-2 border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <div className="flex flex-col items-center justify-center py-8">
                    <ImageIcon className="size-16 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Click to upload image
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, WEBP, GIF (max 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="e.g., Pepperoni Pizza"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Product description..."
                rows={3}
                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Price, Quantity, Unit, Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (so'm) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Stock Quantity
                </label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value),
                    })
                  }
                  placeholder="-1 for unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">
                  -1 = Unlimited stock
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">— none —</option>
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacity
                </label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="e.g. 1.5"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.capacity && formData.unit
                    ? `→ ${formData.capacity}${formData.unit}`
                    : "e.g. 1.5 + l = 1.5l"}
                </p>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category_id ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category_id: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No Category</option>
                {categories
                  .filter((c) => c.is_active)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="size-5 cursor-pointer"
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium cursor-pointer"
              >
                Active (visible to staff in POS)
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>{editingProduct ? "Update Product" : "Create Product"}</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
