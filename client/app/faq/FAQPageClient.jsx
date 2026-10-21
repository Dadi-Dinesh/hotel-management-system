import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import FAQAccordion from "../components/marketing/FAQAccordion";
import { FAQ_ITEMS } from "../lib/marketing/publicContent";
import styles from "../components/marketing/marketing.module.css";

export default function FAQPageClient() {
  return (
    <div className={styles.site}>
      <MarketingNav skipTo="#faq-main" />
      <main
        id="faq-main"
        tabIndex={-1}
        className={`${styles.container} ${styles.faqPage}`}
      >
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Before you get started</p>
          <h1>Frequently asked questions</h1>
          <p>
            About the demo, restaurant applications and your team&apos;s daily
            workflow.
          </p>
        </div>
        <FAQAccordion items={FAQ_ITEMS} />
      </main>
      <MarketingFooter />
    </div>
  );
}
