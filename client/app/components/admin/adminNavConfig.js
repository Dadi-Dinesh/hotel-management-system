import {
  LayoutDashboard,
  Sliders,
  UtensilsCrossed,
  ClipboardList,
  Users,
  Star,
  BarChart3,
  Tag,
  FileBarChart,
  Printer,
  Settings,
  CreditCard,
} from "lucide-react";

/**
 * Single source of truth for the admin sidebar's nav items — also used by
 * the dashboard's own quick-links section, so the two never drift apart.
 */
export const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/tables", icon: Sliders, label: "Tables" },
  { href: "/admin/menu", icon: UtensilsCrossed, label: "Menu" },
  { href: "/admin/orders", icon: ClipboardList, label: "Orders" },
  { href: "/admin/captains", icon: Users, label: "Captains" },
  { href: "/admin/reviews", icon: Star, label: "Reviews" },
  { href: "/admin/menu-performance", icon: BarChart3, label: "Menu Performance" },
  { href: "/admin/offers", icon: Tag, label: "Offers" },
  { href: "/admin/reports", icon: FileBarChart, label: "Reports" },
  { href: "/admin/printer/settings", icon: Printer, label: "Print Engine" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
  { href: "/admin/account", icon: CreditCard, label: "Account & Billing" },
];
