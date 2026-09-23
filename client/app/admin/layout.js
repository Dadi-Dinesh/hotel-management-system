"use client";

import { RestaurantProvider } from "../components/RestaurantContext";

export default function AdminLayout({ children }) {
  return <RestaurantProvider>{children}</RestaurantProvider>;
}
