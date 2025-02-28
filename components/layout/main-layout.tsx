import React from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/ui/mode-toggle" 

export function MainLayout({ children }: { children: React.ReactNode }) {
  // # Dette er hovedlayoutet for applikationen
  // # Det inkluderer header, main-indhold og footer
  // # children er det indhold, der skal vises i main-delen
  return (
    <div className="flex min-h-screen flex-col">
      {/* # Header med navigation og tema-toggle */}
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
          {/* # Navigation med links */}
          <nav className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-lg font-bold">Min Boilerplate</span>
            </Link>
            <div className="flex gap-6">
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
                Om
              </Link>
            </div>
          </nav>
          {/* # Tema-toggle i højre side */}
          <div className="flex items-center">
            <ModeToggle />
          </div>
        </div>
      </header>
      {/* # Hovedindhold med container og padding */}
      <main className="flex-1">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </div>
      </main>
      {/* # Footer med copyright information */}
      <footer className="border-t py-6">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex h-10 items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Min Boilerplate
          </p>
        </div>
      </footer>
    </div>
  )
} 