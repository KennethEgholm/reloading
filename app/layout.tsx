import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reloading Tool",
  description: "Inventory management for reloading components",
  icons: {
    icon: "/images/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">
        <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2.5">
                <img src="/images/logo.svg" alt="Reloading Tool" className="w-9 h-9" />
                <span className="font-semibold text-lg tracking-tight">Reloading Tool</span>
              </a>
              <div className="flex items-center gap-1 text-sm">
                <a 
                  href="/primers" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Image src="/images/primer.svg" alt="Primers" width={20} height={20} />
                  Primers
                </a>
                <a 
                  href="/projectiles" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Image src="/images/projectile.svg" alt="Projectiles" width={20} height={20} />
                  Projectiles
                </a>
                <a 
                  href="/propellants" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Image src="/images/propellant.svg" alt="Propellants" width={20} height={20} />
                  Propellants
                </a>
                <a 
                  href="/recipes" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Image src="/images/recipe.svg" alt="Recipes" width={20} height={20} />
                  Recipes
                </a>
              </div>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500">
              Personal Inventory
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}

