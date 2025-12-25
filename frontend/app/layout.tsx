import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CPM - Predictive Maintenance",
  description: "AI-powered predictive maintenance system with causal inference",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 items-center">
                <div className="mr-4 flex">
                  <a className="mr-6 flex items-center space-x-2" href="/">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 text-primary"
                    >
                      <path d="M12 2v4" />
                      <path d="M12 18v4" />
                      <path d="M4.93 4.93l2.83 2.83" />
                      <path d="M16.24 16.24l2.83 2.83" />
                      <path d="M2 12h4" />
                      <path d="M18 12h4" />
                      <path d="M4.93 19.07l2.83-2.83" />
                      <path d="M16.24 7.76l2.83-2.83" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                    <span className="font-bold">CPM</span>
                  </a>
                  <nav className="flex items-center space-x-6 text-sm font-medium">
                    <a
                      className="transition-colors hover:text-foreground/80 text-foreground"
                      href="/"
                    >
                      Dashboard
                    </a>
                    <a
                      className="transition-colors hover:text-foreground/80 text-foreground/60"
                      href="/galaxy"
                    >
                      Health Galaxy
                    </a>
                  </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                  <span className="text-xs text-muted-foreground">
                    Predictive Maintenance System
                  </span>
                </div>
              </div>
            </header>
            <main className="container py-6">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  )
}
