"use client";

/**
 * RestaurantContext — the current restaurant a staff member is looking at.
 *
 * For a restaurant-scoped Admin/Captain/Kitchen user, this is always their
 * own restaurant (set at login, never changeable from the client).
 * For a Platform Owner (no restaurantId on their account), this tracks
 * whichever restaurant the RestaurantSwitcher has selected — persisted so it
 * survives a refresh — and defaults to "platform-wide" (null) until chosen.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import {
  getRestaurant,
  isPlatformOwner as checkIsPlatformOwner,
  getSelectedRestaurantId,
  setSelectedRestaurantId as persistSelectedRestaurantId,
} from "../lib/auth";

const RestaurantContext = createContext(null);

export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantIdState] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshRestaurants = useCallback(async () => {
    if (!checkIsPlatformOwner()) return;
    try {
      const res = await api.get("/restaurants");
      setRestaurants(res.data.data || []);
    } catch (error) {
      console.error("Failed to load restaurants:", error?.message);
    }
  }, []);

  useEffect(() => {
    const owner = checkIsPlatformOwner();
    setIsOwner(owner);

    if (owner) {
      const selected = getSelectedRestaurantId();
      setSelectedRestaurantIdState(selected);
      refreshRestaurants();
    } else {
      setRestaurant(getRestaurant());
    }
    setLoading(false);
  }, [refreshRestaurants]);

  // Once the owner's restaurant list loads, resolve the full record for the selection.
  useEffect(() => {
    if (!isOwner) return;
    if (!selectedRestaurantId) {
      setRestaurant(null);
      return;
    }
    const found = restaurants.find((r) => r.id === selectedRestaurantId);
    if (found) setRestaurant(found);
  }, [isOwner, selectedRestaurantId, restaurants]);

  const selectRestaurant = useCallback((restaurantId) => {
    persistSelectedRestaurantId(restaurantId);
    setSelectedRestaurantIdState(restaurantId);
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        restaurants,
        isPlatformOwner: isOwner,
        selectedRestaurantId,
        selectRestaurant,
        refreshRestaurants,
        loading,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error("useRestaurant must be used within a <RestaurantProvider>");
  }
  return ctx;
}
