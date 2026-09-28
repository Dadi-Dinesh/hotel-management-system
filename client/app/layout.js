import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./components/SocketProvider";
import { NetworkProvider } from "./components/NetworkProvider";
import { ServiceWorkerManager } from "./components/ServiceWorkerManager";
import ConnectionBanner from "./components/ConnectionBanner";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "./lib/branding";
import { SITE_URL } from "./lib/siteUrl";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PLATFORM_NAME} | Smart QR Restaurant Management`,
    template: `%s | ${PLATFORM_NAME}`,
  },
  description: "ServeSync helps restaurants manage QR ordering, kitchen operations, billing, analytics, and printing.",
  keywords:
    "ServeSync, QR ordering, restaurant management software, restaurant POS, kitchen display system, restaurant SaaS",
  openGraph: {
    type: "website",
    siteName: PLATFORM_NAME,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: PLATFORM_NAME,
    statusBarStyle: "black-translucent",
    startupImage: [
      { url: "/icons/apple-splash-750-1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/icons/apple-splash-1170-2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-1284-2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/icons/apple-splash-1620-2160.png", media: "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#3D2710",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__servesync_deferred_prompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__servesync_deferred_prompt = e;
                window.dispatchEvent(new CustomEvent('servesync:installprompt-ready'));
              });
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen antialiased"
        style={{
          fontFamily: "var(--font-body)",
          background: "var(--color-cream-50, #FFFDF7)",
          color: "var(--color-brown-900, #3D2710)",
        }}
      >
        <SocketProvider>
          <ServiceWorkerManager>
            <NetworkProvider>
              <ConnectionBanner />
              {children}
            </NetworkProvider>
          </ServiceWorkerManager>
          <Toaster
            position="top-center"
            containerClassName="responsive-toaster"
            containerStyle={{
              top: 80,
              left: 16,
              right: 16,
            }}
            toastOptions={{
              duration: 4000,
              style: {
                background: "#FFF8E7",
                color: "#3D2710",
                border: "1px solid #E8891C",
                borderRadius: "0px",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: "600",
                maxWidth: "360px",
                width: "100%",
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
