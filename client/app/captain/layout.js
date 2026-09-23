"use client";

import { RestaurantProvider } from "../components/RestaurantContext";

export default function CaptainLayout({ children }) {
  return <RestaurantProvider>{children}</RestaurantProvider>;
}
