"use client";

import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { useRestaurant } from "../../components/RestaurantContext";
import { DEMO_RESTAURANT } from "../branding";
import { DEFAULT_PRINTER_SETTINGS, type PrinterSettings } from "./PrintService";

/**
 * Loads (and can save) the current restaurant's Universal Print Engine
 * preferences. Falls back to DEFAULT_PRINTER_SETTINGS (browser-print, 80mm,
 * no auto-print) whenever settings haven't loaded yet — this is exactly
 * the safe, zero-config behavior a restaurant gets before ever touching
 * the new Print Settings page.
 */
export function usePrinterSettings() {
  const { restaurant } = useRestaurant();
  const slug = restaurant?.slug || DEMO_RESTAURANT.slug;

  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await api.get(`/restaurants/${slug}/printer-settings`);
      setSettings({ ...DEFAULT_PRINTER_SETTINGS, ...res.data.data });
    } catch {
      // Not authorized (e.g. captain/kitchen role) or not yet created — safe defaults stand.
      setSettings(DEFAULT_PRINTER_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(
    async (patch: Partial<PrinterSettings>) => {
      setSaving(true);
      try {
        const res = await api.patch(`/restaurants/${slug}/printer-settings`, patch);
        setSettings({ ...DEFAULT_PRINTER_SETTINGS, ...res.data.data });
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [slug]
  );

  return { settings, loading, saving, fetchSettings, saveSettings };
}
