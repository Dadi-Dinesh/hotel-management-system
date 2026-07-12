"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  FolderPlus,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";
import ImageUpload from "../../components/ImageUpload";
import { MenuItem, Category, MenuItemFormState } from "../../types";

export default function MenuManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menu, setMenu] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form state
  const [itemForm, setItemForm] = useState<MenuItemFormState>({
    name: "",
    price: "",
    categoryId: "",
    servingInformation: "",
    description: "",
    calories: "",
    imageFile: null,
    imageUrl: null,
    removeImage: false,
    isAvailable: true,
  });
  const [categoryName, setCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingCategories, setDeletingCategories] = useState<Set<string>>(new Set());
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated() || getUser()?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [catRes, menuRes] = await Promise.all([
        api.get("/categories"),
        api.get("/menu"),
      ]);
      setCategories(catRes.data.data);
      setMenu(menuRes.data.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ─── Item CRUD ───────────────────────────────

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      price: "",
      categoryId: categories[0]?.id || "",
      servingInformation: "",
      description: "",
      calories: "",
      imageFile: null,
      imageUrl: null,
      removeImage: false,
      isAvailable: true,
    });
    setUploadProgress(null);
    setShowItemModal(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      price: item.price.toString(),
      categoryId: item.categoryId,
      servingInformation: item.servingInformation || "",
      description: item.description || "",
      calories: item.calories ? item.calories.toString() : "",
      imageFile: null,
      imageUrl: item.imageUrl || item.image || null,
      removeImage: false,
      isAvailable: item.isAvailable,
    });
    setUploadProgress(null);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadProgress(0);

    let fileToUpload = itemForm.imageFile;
    if (fileToUpload) {
      try {
        const { compressImage } = await import("../../lib/imageUtils");
        fileToUpload = await compressImage(fileToUpload);
      } catch (compressionErr) {
        console.error("Client image compression error, proceeding with original:", compressionErr);
      }
    }

    const formData = new FormData();
    formData.append("name", itemForm.name);
    formData.append("price", itemForm.price);
    formData.append("categoryId", itemForm.categoryId);
    formData.append("servingInformation", itemForm.servingInformation || "");
    formData.append("description", itemForm.description || "");
    formData.append("calories", itemForm.calories || "");
    formData.append("isAvailable", itemForm.isAvailable ? "true" : "false");

    if (fileToUpload) {
      formData.append("image", fileToUpload);
    }
    if (itemForm.removeImage) {
      formData.append("removeImage", "true");
    }

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      },
    };

    try {
      if (editingItem) {
        await api.patch(`/menu/${editingItem.id}`, formData, config);
        toast.success("Item updated successfully!");
      } else {
        await api.post("/menu", formData, config);
        toast.success("Item added successfully!");
      }
      setShowItemModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    setDeletingItems((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    try {
      await api.delete(`/menu/${item.id}`);
      toast.success(`${item.name} deleted successfully!`);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || `Failed to delete ${item.name}`);
    } finally {
      setDeletingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // ─── Category CRUD ───────────────────────────

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}`, { name: categoryName });
        toast.success("Category updated!");
      } else {
        await api.post("/categories", { name: categoryName });
        toast.success("Category created!");
      }
      setShowCategoryModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setDeletingCategories((prev) => {
      const next = new Set(prev);
      next.add(cat.id);
      return next;
    });
    try {
      await api.delete(`/categories/${cat.id}`);
      toast.success(`Category "${cat.name}" deleted`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setDeletingCategories((prev) => {
        const next = new Set(prev);
        next.delete(cat.id);
        return next;
      });
    }
  };

  // ─── Filtering ───────────────────────────────

  interface ExtendedMenuItem extends MenuItem {
    categoryName: string;
  }

  const allItems: ExtendedMenuItem[] = menu.flatMap((cat) =>
    cat.items.map((item) => ({
      ...item,
      categoryId: cat.id,
      categoryName: cat.name,
    }))
  );

  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream-50)" }}>
      <Navbar title="Menu Management" subtitle="Admin" backHref="/admin/dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Categories Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Categories
            </h2>
            <button onClick={openAddCategory} className="btn-secondary" style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem" }}>
              <FolderPlus size={14} /> Add Category
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--color-cream-100)", border: "1px solid var(--color-cream-200)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--color-brown-900)" }}>{cat.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-cream-200)", color: "var(--color-text-muted)" }}>{cat._count?.items || 0}</span>
                <button onClick={() => openEditCategory(cat)} className="ml-1" style={{ color: "var(--color-text-muted)" }}><Pencil size={12} /></button>
                <button 
                  onClick={() => handleDeleteCategory(cat)} 
                  disabled={deletingCategories.has(cat.id)}
                  style={{ color: "var(--color-danger)", opacity: deletingCategories.has(cat.id) ? 0.5 : 1 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Menu Items */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
              Menu Items ({allItems.length})
            </h2>
            <button onClick={openAddItem} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}>
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items..." className="input" style={{ paddingLeft: "2.5rem" }} />
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto border-2" style={{ borderColor: "var(--color-brown-900)", background: "var(--color-surface)" }}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 font-black uppercase tracking-wider text-xs" style={{ borderColor: "var(--color-brown-900)", background: "var(--color-cream-100)" }}>
                    <th className="p-4" style={{ color: "var(--color-brown-900)" }}>Item Name</th>
                    <th className="p-4" style={{ color: "var(--color-brown-900)" }}>Category</th>
                    <th className="p-4" style={{ color: "var(--color-brown-900)" }}>Price</th>
                    <th className="p-4" style={{ color: "var(--color-brown-900)" }}>Status</th>
                    <th className="p-4 text-right" style={{ color: "var(--color-brown-900)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className="border-b last:border-0 hover:bg-cream-50 transition-colors text-sm"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <td className="p-4 font-bold flex items-center gap-3" style={{ color: "var(--color-brown-900)" }}>
                        <div
                          className="w-10 h-10 relative rounded overflow-hidden border flex-shrink-0 bg-cream-100 flex items-center justify-center"
                          style={{ borderColor: "var(--color-brown-900)" }}
                        >
                          {item.imageUrl || item.image ? (
                            <img
                              src={item.imageUrl || item.image || undefined}
                              alt={item.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <ImageIcon size={16} className="text-gray-400" />
                          )}
                        </div>
                        <span>{item.name}</span>
                      </td>
                      <td className="p-4 text-xs font-semibold text-gray-600">
                        {item.categoryName}
                      </td>
                      <td className="p-4 font-black" style={{ color: "var(--color-orange-500)" }}>
                        ₹{item.price}
                      </td>
                      <td className="p-4 text-xs font-semibold">
                        {item.isAvailable ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Available</span>
                        ) : (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Unavailable</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditItem(item)} 
                            className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-cream-100 transition-colors"
                            style={{ borderColor: "var(--color-brown-900)", color: "var(--color-brown-900)" }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item)} 
                            disabled={deletingItems.has(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-red-50 transition-colors"
                            style={{ 
                              borderColor: "var(--color-danger)", 
                              color: "var(--color-danger)",
                              opacity: deletingItems.has(item.id) ? 0.5 : 1 
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowItemModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.3)" }} />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 animate-scale-in" style={{ background: "var(--color-cream-50)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{editingItem ? "Edit Item" : "Add Item"}</h3>
              <button onClick={() => setShowItemModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-cream-100)" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Item Name</label>
                <input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required className="input" placeholder="e.g. Chilli Paneer" />
              </div>
              
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Description</label>
                <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="input" placeholder="e.g. Traditional clay oven paneer cubes cooked in red tomato gravy." rows={2} />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Price (₹)</label>
                <input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required className="input" placeholder="e.g. 180" />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Category</label>
                <select value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })} required className="input">
                  <option value="">Select category</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Calories (kcal)</label>
                <input type="number" value={itemForm.calories} onChange={(e) => setItemForm({ ...itemForm, calories: e.target.value })} className="input" placeholder="e.g. 350" />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Serving Information</label>
                <input value={itemForm.servingInformation} onChange={(e) => setItemForm({ ...itemForm, servingInformation: e.target.value })} className="input" placeholder="e.g. Serves 2 People" />
              </div>

              <ImageUpload
                value={itemForm.imageUrl}
                onChange={(file, remove) =>
                  setItemForm({ ...itemForm, imageFile: file, removeImage: remove })
                }
                uploadProgress={uploadProgress}
                saving={saving}
              />

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={itemForm.isAvailable}
                  onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-orange-500)] cursor-pointer"
                />
                <label htmlFor="isAvailable" className="text-sm font-bold uppercase tracking-wider cursor-pointer" style={{ color: "var(--color-brown-900)" }}>
                  Available
                </label>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider">
                <Save size={16} /> {saving ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowCategoryModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.3)" }} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in" style={{ background: "var(--color-cream-50)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{editingCategory ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setShowCategoryModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-cream-100)" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-brown-900)" }}>Category Name</label>
                <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required className="input" placeholder="e.g. Starters" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider">
                <Save size={16} /> {saving ? "Saving..." : editingCategory ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
