import { ChevronDown } from "lucide-react";
import styles from "./marketing.module.css";

// Native disclosure remains readable and keyboard-operable before hydration.
export default function FAQAccordion({ items }) {
  return (
    <div className={styles.faqList}>
      {items.map((item) => (
        <details key={item.question} className={styles.faqItem}>
          <summary>
            {item.question}
            <ChevronDown size={19} aria-hidden="true" />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
