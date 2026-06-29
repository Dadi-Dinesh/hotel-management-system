import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./components/SocketProvider";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "Nookambika Dhaba | Authentic Indian Cuisine",
  description:
    "Order delicious food from Nookambika Dhaba. Scan the QR code on your table, browse our menu, and place your order instantly.",
  keywords: "dhaba, restaurant, Indian food, Nookambika, biryani, order food",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{
          fontFamily: "var(--font-body)",
          background: "var(--color-cream-50, #FFFDF7)",
          color: "var(--color-brown-900, #3D2710)",
        }}
      >
        <SocketProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#FFF8E7",
                color: "#3D2710",
                border: "1px solid #FFEFC7",
                borderRadius: "12px",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                boxShadow: "0 4px 20px rgba(92,61,26,0.08)",
              },
              success: {
                iconTheme: {
                  primary: "#E8891C",
                  secondary: "#FFF8E7",
                },
              },
            }}
          />
        </SocketProvider>
      </body>
    </html>
  );
}
