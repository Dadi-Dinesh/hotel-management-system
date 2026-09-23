"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "../../lib/api";
import { PLATFORM_NAME } from "../../lib/branding";

/**
 * Bare restaurant URL (no table code) — reached after the post-order
 * thank-you countdown, or if someone navigates here directly without
 * scanning a specific table's QR code.
 */
export default function RestaurantHomePage() {
  const params = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/restaurants/${params.slug}`)
      .then((res) => setRestaurant(res.data.data))
      .catch(() => setNotFound(true));
  }, [params.slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-surface)" }}>
        <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Restaurant not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "var(--color-surface)" }}>
      {restaurant?.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={restaurant.logo} alt={`${restaurant.name} logo`} className="w-24 h-24 rounded-full object-cover border-2 mb-6" style={{ borderColor: "var(--color-brown-900)" }} />
      )}
      <h1 className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-brown-900)" }}>
        {restaurant?.name || "Loading..."}
      </h1>
      <p className="text-sm font-bold uppercase tracking-widest max-w-xs" style={{ color: "var(--color-text-muted)" }}>
        Please scan the QR code on your table to start ordering.
      </p>
      <p className="mt-8 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
        Powered by {PLATFORM_NAME}
      </p>
    </div>
  );
}
