export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  imageUrl?: string | null;
  publicId?: string | null;
  servingInformation?: string | null;
  description?: string | null;
  calories?: number | null;
  isAvailable: boolean;
  categoryId: string;
  createdAt: string;
  category?: {
    id: string;
    name: string;
  };
}

export interface Category {
  id: string;
  name: string;
  items: MenuItem[];
  _count?: {
    items: number;
  };
}

export interface MenuItemFormState {
  name: string;
  price: string;
  categoryId: string;
  servingInformation: string;
  description: string;
  calories: string;
  imageFile: File | null;
  imageUrl?: string | null;
  removeImage: boolean;
  isAvailable?: boolean;
}
