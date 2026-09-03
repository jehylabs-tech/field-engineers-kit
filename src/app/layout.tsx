import type { Metadata, Viewport } from "next";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import AppProviders from "@/components/providers/AppProviders";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getPublishedCalculators } from "@/lib/calculators/queries";
import { buildSiteMetadata } from "@/lib/metadata/site-metadata";
import "./globals.css";

export const metadata: Metadata = buildSiteMetadata({ canonicalPath: "/" });

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const calculators = await getPublishedCalculators();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FEK Calculators" />
      </head>
      <body className="font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('fek-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <AppProviders calculators={calculators}>
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col bg-slate-50 dark:bg-spec-bg">
            <Header />
            <main className="flex-1 bg-slate-50 pb-20 dark:bg-spec-bg md:pb-24">{children}</main>
            <Footer />
          </div>
        </AppProviders>
        <SiteAnalytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
