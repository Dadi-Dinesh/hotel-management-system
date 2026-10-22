import Image from "next/image";
import Link from "next/link";
import { PLATFORM_NAME, PLATFORM_LOGO } from "../../lib/branding";
import { CONTACT_EMAIL } from "../../lib/marketing/publicContent";
import styles from "./marketing.module.css";

const GROUPS = [
  {
    title: "Explore",
    links: [
      ["/#features", "Features"],
      ["/#how-it-works", "How it works"],
      ["/demo", "Live demo"],
      ["/faq", "FAQ"],
    ],
  },
  {
    title: "Get started",
    links: [
      ["/apply", "Register restaurant"],
      ["/application-status", "Application status"],
      ["/login", "Staff login"],
      ["/contact", "Contact"],
    ],
  },
  {
    title: "Details",
    links: [
      ["/privacy", "Privacy policy"],
      ["/terms", "Terms of service"],
    ],
  },
];
export default function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div>
            <Link href="/" className={styles.brand}>
              <Image
                src={PLATFORM_LOGO}
                alt=""
                width={34}
                height={34}
                className="rounded-lg object-contain shadow-xs flex-shrink-0"
              />
              {PLATFORM_NAME}
            </Link>
            <p>
              Table orders, kitchen updates
              <br />
              and restaurant management.
            </p>
            <a className={styles.footerEmail} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>
          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={`${group.title} footer links`}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <p>
            © {new Date().getFullYear()} {PLATFORM_NAME}
          </p>
          <p>Made for the way restaurants work.</p>
        </div>
      </div>
    </footer>
  );
}
