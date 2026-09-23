import ContactPageClient from "./ContactPageClient";
import { PLATFORM_NAME } from "../lib/branding";

export const metadata = {
  title: "Contact",
  description: `Get in touch with the ${PLATFORM_NAME} team — questions, feature requests, or Enterprise/business inquiries.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
