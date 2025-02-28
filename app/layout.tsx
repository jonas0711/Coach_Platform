import React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"
import { MainLayout } from "@/components/layout/main-layout"

// # Indlæser Inter-fonten med latin tegnsæt
const inter = Inter({ subsets: ["latin"] })

// # Metadata for siden (titel og beskrivelse)
export const metadata = {
  title: "Coach Platform",
  description: "Trænerplatform til håndboldholdadministration og træningsplanlægning",
}

// # Root layout component, der indkapsler hele applikationen
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da" suppressHydrationWarning>
      {/* # Bruger Inter-fonten på body */}
      <body className={inter.className}>
        {/* # ThemeProvider giver tema-funktionalitet til hele applikationen */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* # MainLayout giver konsistent header og footer på alle sider */}
          <MainLayout>{children}</MainLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}
