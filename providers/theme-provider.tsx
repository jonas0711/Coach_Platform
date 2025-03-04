"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // # Dette komponent indkapsler applikationen og giver tema-funktionalitet til alle komponenter
  // # Det bruger NextThemesProvider fra next-themes biblioteket
  // # children er de komponenter, der skal have adgang til temaet
  // # props indeholder konfigurationsindstillinger for temaet (f.eks. default tema)
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
} 