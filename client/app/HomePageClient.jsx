"use client";

import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  ChefHat,
  Users,
  Receipt,
  BarChart3,
  Smartphone,
  Check,
  Mail,
} from "lucide-react";
import MarketingNav from "./components/marketing/MarketingNav";
import MarketingFooter from "./components/marketing/MarketingFooter";
import HeroMockup from "./components/marketing/HeroMockup";
import FAQAccordion from "./components/marketing/FAQAccordion";
import Button from "./components/ui/Button";
import { CONTACT_EMAIL, FAQ_ITEMS } from "./lib/marketing/publicContent";
import styles from "./components/marketing/marketing.module.css";

const FEATURES = [
  {
    icon: QrCode,
    title: "Let guests order at their table",
    text: "A table QR opens your menu in the browser. Guests choose their items and send an order to your team.",
  },
  {
    icon: ChefHat,
    title: "Keep the kitchen in the loop",
    text: "See incoming orders, quantities and preparation progress together in the kitchen workspace.",
  },
  {
    icon: Users,
    title: "Give waiters a clear overview",
    text: "Captains can accept orders, follow table activity and respond to reminders and bill requests.",
  },
  {
    icon: Receipt,
    title: "Bring orders together for billing",
    text: "Review a table's orders, prepare its bill and close the session after handling payment.",
  },
  {
    icon: BarChart3,
    title: "Understand your restaurant's orders",
    text: "Review order history, popular menu items and busy periods using your restaurant's stored data.",
  },
];
const STEPS = [
  {
    title: "Explore the demo",
    text: "Try the existing customer ordering experience. No account needed.",
  },
  {
    title: "Register your restaurant",
    text: "Tell us about your business, contact details and tables.",
  },
  {
    title: "ServeSync reviews your application",
    text: "Your application is reviewed before your restaurant is set up.",
  },
  {
    title: "Get your setup details",
    text: "After approval, the team helps you access your accounts and table QR codes.",
  },
];

export default function HomePageClient() {
  return (
    <div className={styles.site}>
      <MarketingNav skipTo="#main-content" />
      <main id="main-content" tabIndex={-1}>
        <section
          className={`${styles.container} ${styles.hero}`}
          aria-labelledby="hero-title"
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span /> A little more order. A little less running around.
            </p>
            <h1 id="hero-title">
              From the first order
              <br className={styles.desktopBreak} /> to the final bill.
              <br />
              <em>All in one place.</em>
            </h1>
            <p className={styles.heroDescription}>
              ServeSync brings table ordering, your kitchen and your waiter team
              together. Give guests an easy way to order, and staff a clear view
              of what comes next.
            </p>
            <div className={styles.heroActions}>
              <Button
                href="/demo"
                icon={ArrowRight}
                iconPosition="right"
                fullWidthOnMobile
              >
                Explore Live Demo
              </Button>
              <Button href="/apply" variant="secondary" fullWidthOnMobile>
                Register Your Restaurant
              </Button>
            </div>
            <p className={styles.heroFootnote}>
              <Check size={16} aria-hidden="true" /> No customer app needed{" "}
              <span aria-hidden="true">·</span> Try the demo without signing up
            </p>
          </div>
          <HeroMockup />
        </section>

        <section
          className={styles.customerSection}
          aria-labelledby="customer-title"
        >
          <div className={`${styles.container} ${styles.customerGrid}`}>
            <div>
              <p className={styles.eyebrow}>Simple for your guests</p>
              <h2 id="customer-title">
                Their phone.
                <br />
                Your menu.
              </h2>
              <p>
                Put a QR code on each table. Guests scan it and order from their
                browser, without downloading an app.
              </p>
            </div>
            <ol className={styles.customerSteps}>
              <li>
                <QrCode size={24} aria-hidden="true" />
                <div>
                  <h3>Scan the table QR</h3>
                  <p>Open the restaurant menu on a phone.</p>
                </div>
              </li>
              <li>
                <Smartphone size={24} aria-hidden="true" />
                <div>
                  <h3>Choose and place an order</h3>
                  <p>Browse items and send the order to the team.</p>
                </div>
              </li>
              <li>
                <Receipt size={24} aria-hidden="true" />
                <div>
                  <h3>Follow along, then request the bill</h3>
                  <p>See order updates and call for assistance when needed.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section
          id="features"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>
              Built around a restaurant&apos;s day
            </p>
            <h2 id="features-title">The right view for every role.</h2>
            <p>
              One connected workflow, from a guest&apos;s table to the kitchen
              and back.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className={styles.feature}>
                <Icon size={25} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className={styles.onboarding}
          aria-labelledby="steps-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <p className={styles.eyebrow}>Getting started</p>
              <h2 id="steps-title">
                Explore first. Apply when you&apos;re ready.
              </h2>
              <p>
                Registration starts an application. Your restaurant is set up
                after ServeSync reviews and approves it.
              </p>
            </div>
            <ol className={styles.steps}>
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
            <div className={styles.applicationNote}>
              <span>Already sent your details?</span>
              <Link href="/application-status">
                Check application status{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className={`${styles.container} ${styles.section} ${styles.faqGrid}`}
          aria-labelledby="faq-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>A few things to know</p>
            <h2 id="faq-title">
              Questions before
              <br />
              you get started?
            </h2>
            <p>
              Here is what the current application supports, and what happens
              next.
            </p>
            <Link href="/contact" className={styles.textLink}>
              Get in touch <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <FAQAccordion items={FAQ_ITEMS} />
        </section>

        <section
          id="contact"
          className={`${styles.container} ${styles.contactSection}`}
          aria-labelledby="contact-title"
        >
          <div className={styles.contactPanel}>
            <div>
              <p className={styles.eyebrow}>Let&apos;s get you started</p>
              <h2 id="contact-title">
                See how ServeSync fits your restaurant.
              </h2>
              <p>
                Explore the customer experience, or send in your restaurant
                details for review.
              </p>
              <div className={styles.heroActions}>
                <Button
                  href="/demo"
                  icon={ArrowRight}
                  iconPosition="right"
                  fullWidthOnMobile
                >
                  Explore Live Demo
                </Button>
                <Button
                  href="/apply"
                  variant="secondary-light"
                  fullWidthOnMobile
                >
                  Register Restaurant
                </Button>
              </div>
            </div>
            <div className={styles.contactDetails}>
              <Mail size={25} aria-hidden="true" />
              <h3>Have a question?</h3>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <p>
                Email us about registration or setup. This link opens your email
                app.
              </p>
              <Link href="/contact">
                Contact options <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
