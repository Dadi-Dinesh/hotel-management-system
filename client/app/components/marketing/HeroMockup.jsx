"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  ChefHat,
  Users,
  BarChart3,
  Check,
  Receipt,
} from "lucide-react";
import { PLATFORM_NAME, PLATFORM_LOGO } from "../../lib/branding";
import styles from "./marketing.module.css";

// A labeled interface illustration of existing workflows, not live data.
// No revenue, customer counts, timers or other fictional metrics.
const VIEWS = [
  {
    key: "customer",
    label: "Customer",
    icon: QrCode,
    title: "From a table QR to the kitchen",
    description: "Guests choose their food. Your team gets the order.",
    rows: [
      "Browse the restaurant menu",
      "Choose items and place an order",
      "Follow progress and request the bill",
    ],
    note: "No app installation or customer account needed.",
    next: "Orders appear in the staff and kitchen views.",
  },
  {
    key: "kitchen",
    label: "Kitchen",
    icon: ChefHat,
    title: "See what needs preparing",
    description: "A shared kitchen view keeps incoming orders visible.",
    rows: [
      "See incoming order tickets",
      "Group quantities by menu item",
      "Update individual item progress",
    ],
    note: "Preparation updates are shared with the team.",
    next: "Captains can follow orders through to service.",
  },
  {
    key: "captain",
    label: "Captain",
    icon: Users,
    title: "Keep up with every table",
    description: "Waiters follow orders and respond to customer requests.",
    rows: [
      "Review and accept orders",
      "Respond to table reminders",
      "Handle bill requests and close sessions",
    ],
    note: "Captain is the workspace for your waiter team.",
    next: "Bill printing options are available when configured.",
  },
  {
    key: "admin",
    label: "Admin",
    icon: BarChart3,
    title: "Manage your restaurant",
    description: "Restaurant administrators organize daily operations.",
    rows: [
      "Manage the menu and tables",
      "Create staff accounts and invitations",
      "Review orders and restaurant reports",
    ],
    note: "This is restaurant administration, not the ServeSync platform portal.",
    next: "Reports use the restaurant's stored order data.",
  },
];

export default function HeroMockup() {
  const [active, setActive] = useState(0);
  const tabs = useRef([]);
  const id = useId();
  const view = VIEWS[active];
  const Icon = view.icon;
  const onKeyDown = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % VIEWS.length;
    if (event.key === "ArrowLeft")
      next = (index + VIEWS.length - 1) % VIEWS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = VIEWS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <figure
      className={styles.preview}
      aria-label="ServeSync product walkthrough"
    >
      <div className={styles.previewBar}>
        <span className={styles.previewBrand} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Image src={PLATFORM_LOGO} alt="" width={18} height={18} className="rounded object-contain" />
          {PLATFORM_NAME}
        </span>
        <span className={styles.previewLabel}>Product walkthrough</span>
      </div>
      <div
        role="tablist"
        aria-label="Explore a workspace"
        className={styles.previewTabs}
      >
        {VIEWS.map((item, index) => (
          <button
            key={item.key}
            ref={(el) => {
              tabs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={active === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        key={view.key}
        role="tabpanel"
        id={`${id}-panel-${active}`}
        aria-labelledby={`${id}-tab-${active}`}
        tabIndex={0}
        className={styles.previewPanel}
      >
        <span className={styles.previewIcon}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <h2>{view.title}</h2>
        <p className={styles.previewDescription}>{view.description}</p>
        <ol className={styles.previewRows}>
          {view.rows.map((row, index) => (
            <li key={row}>
              <span>{index + 1}</span>
              {row}
              <Check size={15} aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div className={styles.previewHandoff}>
          <Receipt size={18} aria-hidden="true" />
          <span>{view.next}</span>
        </div>
        <p className={styles.previewNote}>{view.note}</p>
      </div>
      <figcaption className={styles.previewCaption}>
        Interface illustration · no live orders shown.
        <Link href="/demo">
          Try the customer demo <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </figcaption>
    </figure>
  );
}
