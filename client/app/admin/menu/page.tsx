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
  UtensilsCrossed,
} from "lucide-react";
import api from "../../lib/api";
import { isAuthenticated, getUser } from "../../lib/auth";
import DashboardHeader from "../../components/admin/DashboardHeader";
import { SkeletonCard } from "../../components/customer/SkeletonCard";
import EmptyState from "../../components/EmptyState";
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

  // ESC closes whichever modal is open
  useEffect(() => {
    if (!showItemModal && !showCategoryModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowItemModal(false);
      setShowCategoryModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showItemModal, showCategoryModal]);

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

  const [dietFilter, setDietFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reuses the exact same DELETE /menu/:id endpoint as the single-item
  // delete button — just calls it once per selected item.
  const handleBulkDelete = async () => {
    if (selectedItemIds.size === 0) return;
    if (!confirm(`Delete ${selectedItemIds.size} selected item(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(Array.from(selectedItemIds).map((id) => api.delete(`/menu/${id}`)));
      toast.success(`Deleted ${selectedItemIds.size} item(s).`);
      setSelectedItemIds(new Set());
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

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

  const filteredItems = allItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesDiet =
      dietFilter === "ALL"
        ? true
        : dietFilter === "VEG"
        ? item.isVeg
        : !item.isVeg;
    const matchesCategory = !categoryFilter || item.categoryId === categoryFilter;
    return matchesSearch && matchesDiet && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ss-bg)" }}>
      <DashboardHeader title="Menu" subtitle="Manage items & categories" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Categories Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="ss-h3" style={{ marginBottom: 0 }}>Categories</h2>
            <button
              onClick={openAddCategory}
              className="ss-btn ss-caption font-bold py-2 px-3.5 flex items-center gap-1.5"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", color: "var(--ss-primary)", borderRadius: "var(--ss-radius-button)" }}
            >
              <FolderPlus size={14} /> Add Category
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)" }}>
                <span className="ss-small font-semibold" style={{ color: "var(--ss-primary)" }}>{cat.name}</span>
                <span className="ss-caption font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--ss-bg)", color: "var(--ss-secondary)" }}>{cat._count?.items || 0}</span>
                <button onClick={() => openEditCategory(cat)} className="ml-1" style={{ color: "var(--ss-secondary)" }} aria-label={`Edit ${cat.name}`}><Pencil size={12} /></button>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  disabled={deletingCategories.has(cat.id)}
                  aria-label={`Delete ${cat.name}`}
                  style={{ color: "var(--ss-danger)", opacity: deletingCategories.has(cat.id) ? 0.5 : 1 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Menu Items */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="ss-h3" style={{ marginBottom: 0 }}>Menu Items ({filteredItems.length})</h2>
            <button
              onClick={openAddItem}
              className="ss-btn ss-caption font-bold py-2.5 px-4 flex items-center gap-1.5"
              style={{ background: "var(--ss-accent)", color: "var(--ss-on-accent)", borderRadius: "var(--ss-radius-button)" }}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--ss-secondary)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="ss-input ss-small w-full h-11 pl-11 pr-4 font-medium"
              style={{ background: "var(--ss-surface)", border: "1px solid var(--ss-border)", borderRadius: "var(--ss-radius-input)", color: "var(--ss-primary)" }}
            />
          </div>

          {/* Category filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: "none" }}>
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full ss-caption font-bold whitespace-nowrap transition-all"
              style={{
                background: !categoryFilter ? "var(--ss-primary)" : "var(--ss-surface)",
                color: !categoryFilter ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                border: "1px solid var(--ss-border)",
              }}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full ss-caption font-bold whitespace-nowrap transition-all"
                style={{
                  background: categoryFilter === cat.id ? "var(--ss-primary)" : "var(--ss-surface)",
                  color: categoryFilter === cat.id ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                  border: "1px solid var(--ss-border)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Diet filter */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDietFilter("ALL")}
              className="px-3 py-1.5 rounded-full ss-caption font-bold transition-all"
              style={{
                background: dietFilter === "ALL" ? "var(--ss-primary)" : "var(--ss-surface)",
                color: dietFilter === "ALL" ? "var(--ss-on-accent)" : "var(--ss-secondary)",
                border: "1px solid var(--ss-border)",
              }}
            >
              All ({allItems.length})
            </button>
            <button
              type="button"
              onClick={() => setDietFilter("VEG")}
              className="px-3 py-1.5 rounded-full ss-caption font-bold transition-all"
              style={{
                background: dietFilter === "VEG" ? "var(--ss-success)" : "var(--ss-surface)",
                color: dietFilter === "VEG" ? "#fff" : "var(--ss-secondary)",
                border: "1px solid var(--ss-border)",
              }}
            >
              🟢 Veg ({allItems.filter((i) => i.isVeg).length})
            </button>
            <button
              type="button"
              onClick={() => setDietFilter("NON_VEG")}
              className="px-3 py-1.5 rounded-full ss-caption font-bold transition-all"
              style={{
                background: dietFilter === "NON_VEG" ? "var(--ss-accent-dark)" : "var(--ss-surface)",
                color: dietFilter === "NON_VEG" ? "#fff" : "var(--ss-secondary)",
                border: "1px solid var(--ss-border)",
              }}
            >
              🔴 Non-Veg ({allItems.filter((i) => !i.isVeg).length})
            </button>
          </div>

          {/* Bulk action bar */}
          {selectedItemIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-2xl" style={{ background: "var(--ss-accent-tint)", border: "1px solid var(--ss-border)" }}>
              <span className="ss-small font-bold" style={{ color: "var(--ss-accent-dark)" }}>
                {selectedItemIds.size} item{selectedItemIds.size > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedItemIds(new Set())} className="ss-caption font-bold" style={{ color: "var(--ss-secondary)" }}>
                  Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="ss-btn ss-caption font-bold py-2 px-3.5 flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: "var(--ss-danger)", color: "#fff", borderRadius: "var(--ss-radius-button)" }}
                >
                  <Trash2 size={13} /> {bulkDeleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed size={28} style={{ color: "var(--ss-secondary)" }} />}
              title="No menu items"
              description="No items match your search or filter — add a menu item to get started."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="rounded-[var(--ss-radius-card)] overflow-hidden flex flex-col"
                    style={{
                      border: `1px solid ${isSelected ? "var(--ss-accent)" : "var(--ss-border)"}`,
                      background: "var(--ss-surface)",
                      boxShadow: isSelected ? "var(--ss-shadow-md)" : "var(--ss-shadow-sm)",
                    }}
                  >
                    <div className="relative w-full aspect-[4/3] flex-shrink-0" style={{ background: "var(--ss-bg)" }}>
                      {item.imageUrl || item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl || item.image || undefined} alt={item.name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={28} style={{ color: "var(--ss-secondary)" }} />
                        </div>
                      )}
                      <button
                        onClick={() => toggleItemSelected(item.id)}
                        aria-label={isSelected ? `Deselect ${item.name}` : `Select ${item.name}`}
                        className="absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: isSelected ? "var(--ss-accent)" : "rgba(255,253,248,0.9)", border: "1px solid var(--ss-border)" }}
                      >
                        {isSelected && <span style={{ color: "var(--ss-on-accent)", fontSize: 12, lineHeight: 1 }}>✓</span>}
                      </button>
                      <span
                        className="absolute top-2 right-2 ss-caption font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: item.isAvailable ? "rgba(27,138,90,0.9)" : "rgba(214,69,69,0.9)",
                          color: "#fff",
                        }}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    <div className="p-3.5 flex flex-col flex-1 gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold ss-small leading-snug" style={{ color: "var(--ss-primary)" }}>{item.name}</h3>
                        <span className="font-bold ss-small flex-shrink-0" style={{ color: "var(--ss-accent-dark)" }}>₹{item.price}</span>
                      </div>
                      <p className="ss-caption font-semibold">{item.categoryName}</p>
                      {item.servingInformation && (
                        <p className="ss-caption" style={{ color: "var(--ss-secondary)" }}>🍽️ {item.servingInformation}</p>
                      )}

                      <div className="mt-auto pt-2 flex items-center gap-2">
                        <button
                          onClick={() => openEditItem(item)}
                          className="flex-1 py-2 ss-caption font-bold rounded-full flex items-center justify-center gap-1"
                          style={{ border: "1px solid var(--ss-border)", color: "var(--ss-primary)" }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={deletingItems.has(item.id)}
                          className="flex-1 py-2 ss-caption font-bold rounded-full flex items-center justify-center gap-1 disabled:opacity-50"
                          style={{ border: "1px solid var(--ss-border)", color: "var(--ss-danger)" }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowItemModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
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
          <div className="absolute inset-0" style={{ background: "rgba(61, 39, 16, 0.4)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
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
