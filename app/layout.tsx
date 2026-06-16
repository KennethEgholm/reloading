import type { Metadata } from "next";
import { Geist, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { Toaster } from "sonner";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Settings } from "lucide-react";
import { MaterialsMenu } from "./MaterialsMenu";
import { ThemeApplier } from "./ThemeApplier";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display face for headings — technical/condensed feel that carries the brand identity.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

// Monospace for numeric/ballistics data; paired with tabular-nums in globals.css.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: "/images/logo.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col text-zinc-950 dark:text-zinc-50">
        {/*
          Pre-paint theme application to avoid a flash of the wrong theme. Reads
          localStorage "theme" (light | dark | system; default system) and toggles
          the `.dark` class on <html>. Must live INSIDE <body> — a beforeInteractive
          script placed as a direct child of <html> is invalid nesting ("<html>
          cannot contain a nested <script>") and triggers a hydration error.
          ThemeApplier re-applies the class after hydration, which React
          reconciliation of the <html> className can otherwise drop.
        */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var a=localStorage.getItem('accent')||'copper';document.documentElement.setAttribute('data-theme',a);}catch(e){}})();`}
        </Script>
        <ThemeApplier />
        <NextIntlClientProvider messages={messages}>
          <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2.5">
                  <img src="/images/logo.svg" alt={t('home')} className="w-9 h-9" />
                  <span className="font-semibold text-lg tracking-tight">{t('home')}</span>
                </Link>
                <div className="flex items-center gap-1 text-sm">
                  <MaterialsMenu />
                  <Link
                    href="/recipes"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Image src="/images/recipe.svg" alt={t('recipes')} width={20} height={20} />
                    {t('recipes')}
                  </Link>
                  <Link
                    href="/logs"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Image src="/images/log.svg" alt={t('logs')} width={20} height={20} />
                    {t('logs')}
                  </Link>
                  <Link
                    href="/range"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Image src="/images/range.svg" alt={t('range')} width={20} height={20} />
                    {t('range')}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Settings size={20} />
                  {t('settings')}
                </Link>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  {t('personalInventory')}
                </span>
              </div>
            </div>
          </nav>
          <main className="flex-1">{children}</main>
          <Toaster position="top-center" richColors closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
