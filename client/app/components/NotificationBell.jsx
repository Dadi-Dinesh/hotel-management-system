"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Clock, XCircle, Store, X } from "lucide-react";
import { getSocket } from "../lib/socket";
import toast from "react-hot-toast";

export default function NotificationBell({ onNewApplication }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join platform admin room
    socket.emit("join-platform");

    const handleNewApplication = (app) => {
      const newNotif = {
        id: `notif-${Date.now()}-${Math.random()}`,
        type: "NEW_APPLICATION",
        title: "New Restaurant Application",
        message: `${app.restaurantName} (${app.city}) requested ${app.tableCount} tables.`,
        applicationId: app.id,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
      setUnreadCount((c) => c + 1);

      // Instant UI toast
      toast.custom(
        (t) => (
          <div
            className={`max-w-md w-full bg-white shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4 border-l-4 border-orange-500 transition-all ${
              t.visible ? "animate-enter" : "animate-leave"
            }`}
          >
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <Store size={20} />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600">New Restaurant Application</p>
                  <p className="text-sm font-black text-brown-900">{app.restaurantName}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {app.ownerName} • {app.city} • {app.tableCount} tables
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex items-center gap-2">
              <Link
                href={`/platform/${app.id}`}
                onClick={() => toast.dismiss(t.id)}
                className="text-xs font-bold text-orange-600 uppercase tracking-wider hover:underline"
              >
                Review
              </Link>
              <button onClick={() => toast.dismiss(t.id)} className="text-neutral-400 hover:text-neutral-600">
                <X size={16} />
              </button>
            </div>
          </div>
        ),
        { duration: 6000 }
      );

      // Trigger parent callback to refresh list without page refresh
      if (onNewApplication) {
        onNewApplication(app);
      }
    };

    socket.on("application:new", handleNewApplication);

    return () => {
      socket.off("application:new", handleNewApplication);
    };
  }, [onNewApplication]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl border transition-colors hover:bg-cream-100 flex items-center justify-center"
        style={{ borderColor: "var(--color-border-light)", color: "var(--color-brown-900)" }}
        aria-label="Platform Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-black text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border bg-white shadow-xl z-50 overflow-hidden"
          style={{ borderColor: "var(--color-border-light)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-cream-50" style={{ borderColor: "var(--color-border-light)" }}>
            <span className="text-xs font-bold uppercase tracking-wider text-brown-900">
              Live Notifications {notifications.length > 0 && `(${notifications.length})`}
            </span>
            {notifications.length > 0 && (
              <button
                onClick={() => setNotifications([])}
                className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-700"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No new notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={`/platform/${notif.applicationId}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-3.5 hover:bg-cream-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Store size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-brown-900 truncate">{notif.title}</p>
                      <p className="text-[11px] text-neutral-600 line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
