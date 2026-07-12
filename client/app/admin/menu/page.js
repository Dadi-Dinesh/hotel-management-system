"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Image as ImageIcon,
  FolderPlus,
  Save,
} from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

export default function MenuManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form state
  const [itemForm, setItemForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    isAvailable: true,
    servingInformation: "",
  });
  const [itemImage, setItemImage] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingCategories, setDeletingCategories] = useState(new Set());
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [togglingItems, setTogglingItems] = useState(new Set());

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
    setItemForm({ name: "", price: "", categoryId: categories[0]?.id || "", isAvailable: true, servingInformation: "" });
    setItemImage(null);
    setShowItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      price: item.price.toString(),
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      servingInformation: item.servingInformation || "",
    });
    setItemImage(null);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("name", itemForm.name);
    formData.append("price", itemForm.price);
    formData.append("categoryId", itemForm.categoryId);
    formData.append("isAvailable", itemForm.isAvailable);
    formData.append("servingInformation", itemForm.servingInformation || "");
    if (itemImage) formData.append("image", itemImage);

    try {
      if (editingItem) {
        await api.patch(`/menu/${editingItem.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Item updated!");
      } else {
        await api.post("/menu", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Item added!");
      }
      setShowItemModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setDeletingItems((prev) => new Set([...prev, item.id]));
    try {
      await api.delete(`/menu/${item.id}`);
      toast.success(`${item.name} deleted`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setDeletingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleToggleAvailability = async (item) => {
    setTogglingItems((prev) => new Set([...prev, item.id]));
    try {
      await api.patch(`/menu/${item.id}`, { isAvailable: (!item.isAvailable).toString() });
      toast.success(`${item.name} ${!item.isAvailable ? "available" : "unavailable"}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setTogglingItems((prev) => {
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

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
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
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    setDeletingCategories((prev) => new Set([...prev, cat.id]));
    try {
      await api.delete(`/categories/${cat.id}`);
      toast.success(`Category "${cat.name}" deleted`);
      fetchData();
    } catch (error) {
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

  const allItems = menu.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, categoryId: cat.id, categoryName: cat.name }))
  );

  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.servingInformation && item.servingInformation.toLowerCase().includes(search.toLowerCase()))
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
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "var(--color-cream-100)" }}>
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" /> : "🍽️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{item.name}</p>
                      {!item.isAvailable && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#FFEBEE", color: "#C62828" }}>Unavailable</span>}
                    </div>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {item.categoryName} · ₹{item.price}
                      {item.servingInformation && ` · 👥 ${item.servingInformation}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleToggleAvailability(item)} 
                      disabled={togglingItems.has(item.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center" 
                      style={{ background: item.isAvailable ? "#E8F5E9" : "#FFEBEE", color: item.isAvailable ? "#2E7D32" : "#C62828", opacity: togglingItems.has(item.id) ? 0.5 : 1 }} 
                      title={item.isAvailable ? "Make unavailable" : "Make available"}
                    >
                      {item.isAvailable ? "✓" : "✗"}
                    </button>
                    <button onClick={() => openEditItem(item)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-cream-100)", color: "var(--color-text-secondary)" }}><Pencil size={14} /></button>
                    <button 
                      onClick={() => handleDeleteItem(item)} 
                      disabled={deletingItems.has(item.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center" 
                      style={{ background: "#FFEBEE", color: "#C62828", opacity: deletingItems.has(item.id) ? 0.5 : 1 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowItemModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.3)" }} />
          <div className="relative w-full max-w-md rounded-2xl p-6 animate-scale-in" style={{ background: "var(--color-cream-50)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>{editingItem ? "Edit Item" : "Add Item"}</h3>
              <button onClick={() => setShowItemModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-cream-100)" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Name</label>
                <input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required className="input" placeholder="e.g. Chicken Biryani" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Price (₹)</label>
                <input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} required className="input" placeholder="250" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Category</label>
                <select value={itemForm.categoryId} onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })} required className="input">
                  <option value="">Select category</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Image</label>
                <input type="file" accept="image/*" onChange={(e) => setItemImage(e.target.files[0])} className="input" style={{ padding: "0.5rem" }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Serving Information (Optional)</label>
                <input
                  value={itemForm.servingInformation || ""}
                  onChange={(e) => setItemForm({ ...itemForm, servingInformation: e.target.value })}
                  className="input"
                  placeholder="e.g. Serves 2 People, Enough for 6 Rotis, Family Pack"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="available" checked={itemForm.isAvailable} onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })} />
                <label htmlFor="available" className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Available</label>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
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
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>Category Name</label>
                <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required className="input" placeholder="e.g. Starters" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                <Save size={16} /> {saving ? "Saving..." : editingCategory ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
