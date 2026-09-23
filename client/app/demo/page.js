import DemoPageClient from "./DemoPageClient";
import { PLATFORM_NAME, DEMO_RESTAURANT } from "../lib/branding";

export const metadata = {
  title: "Live Demo",
  description: `Try ${PLATFORM_NAME}'s customer ordering experience live, using our demo restaurant ${DEMO_RESTAURANT.name} — no signup required.`,
  openGraph: {
    title: `Explore the ${PLATFORM_NAME} Live Demo`,
    description: `Scan a table QR or enter a table number to try ${DEMO_RESTAURANT.name}'s full ordering flow.`,
  },
};

export default function DemoPage() {
  return <DemoPageClient />;
}
