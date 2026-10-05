// Kept as a stable URL for existing links/bookmarks — the actual login form
// now lives in one place (app/admin/login/page.js) so Restaurant Admin and
// ServeSync Platform Admin can't drift into two different gates/behaviors.
import AdminLoginPage from "../../admin/login/page";

export const metadata = {
  title: "Restaurant Dashboard Login | ServeSync",
  description: "Sign in to manage your restaurant operations with ServeSync.",
};

export default function RestaurantLoginPage() {
  return <AdminLoginPage />;
}
