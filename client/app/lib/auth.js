/**
 * Auth helpers — localStorage-based JWT management
 */

export const setAuth = (token, user, restaurant = null) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    // A previous session's platform restaurant selection must never leak
    // into a new login on the same browser.
    localStorage.removeItem("selectedRestaurantId");
    if (restaurant) {
      localStorage.setItem("restaurant", JSON.stringify(restaurant));
    } else {
      localStorage.removeItem("restaurant");
    }
  }
};

export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

export const getUser = () => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const clearAuth = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("restaurant");
    localStorage.removeItem("selectedRestaurantId");
  }
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const hasRole = (role) => {
  const user = getUser();
  return user?.role === role;
};

/** The logged-in user's own restaurant (branding etc.) — null for a Platform Owner. */
export const getRestaurant = () => {
  if (typeof window !== "undefined") {
    const restaurant = localStorage.getItem("restaurant");
    return restaurant ? JSON.parse(restaurant) : null;
  }
  return null;
};

/** True when this account has no restaurantId — sees every restaurant. */
export const isPlatformOwner = () => {
  const user = getUser();
  return !!user && !user.restaurantId;
};

/** Platform Owners only: which restaurant they're currently viewing via the switcher. */
export const getSelectedRestaurantId = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("selectedRestaurantId");
  }
  return null;
};

export const setSelectedRestaurantId = (restaurantId) => {
  if (typeof window !== "undefined") {
    if (restaurantId) {
      localStorage.setItem("selectedRestaurantId", restaurantId);
    } else {
      localStorage.removeItem("selectedRestaurantId");
    }
  }
};

/** The restaurantId a staff socket connection should join rooms under —
 * their own account's restaurant, or (for a Platform Owner) whichever one
 * the RestaurantSwitcher has selected. */
export const getEffectiveRestaurantId = () => {
  const user = getUser();
  return user?.restaurantId || getSelectedRestaurantId() || null;
};

/** Home of the ServeSync Admin (platform owner) portal. */
export const PLATFORM_HOME = "/platform";

/**
 * Single source of truth for "where does this account land after login".
 * A ServeSync Platform Admin (no restaurantId) always goes to the platform
 * portal — never to a restaurant's /admin dashboard. Restaurant accounts go
 * to their role's workspace, which is scoped to their own restaurant by the
 * server. Every login form should call this instead of re-deriving it.
 */
export const getPostLoginRoute = (user) => {
  if (user && !user.restaurantId) return PLATFORM_HOME;
  switch (user?.role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "CAPTAIN":
    // MANAGER has no dashboard of its own — the Captain UI is its only
    // usable surface today (see captain/login/page.js).
    case "MANAGER":
      return "/captain/dashboard";
    case "KITCHEN":
      return "/kitchen";
    default:
      return "/login";
  }
};
