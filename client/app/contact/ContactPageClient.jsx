import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { CONTACT_EMAIL } from "../lib/marketing/publicContent";
import styles from "../components/marketing/marketing.module.css";

export default function ContactPageClient() {
  return (
    <div className={styles.site}>
      <MarketingNav skipTo="#contact-main" />
      <main
        id="contact-main"
        tabIndex={-1}
        className={`${styles.container} ${styles.contactPage}`}
      >
        <p className={styles.eyebrow}>Contact ServeSync</p>
        <h1>Let&apos;s talk about your restaurant.</h1>
        <p>
          Have a question about registration or getting set up? Use the existing
          ServeSync contact address below.
        </p>
        <div className={styles.contactCard}>
          <Mail size={28} aria-hidden="true" />
          <h2>Email ServeSync</h2>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <p>
            This opens your email app. Send your message there. ServeSync does
            not send or store a contact request from this page.
          </p>
          <p>
            If no email app opens, copy the address into your usual email
            service.
          </p>
        </div>
        <div className={styles.contactRoutes}>
          <Link href="/application-status">
            Check an existing application{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/apply">
            Register your restaurant <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/demo">
            Explore the live demo <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
