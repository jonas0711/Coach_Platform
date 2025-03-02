'use client'; // Markerer at dette er en klient-komponent

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Dette er en klient-side komponent, som kan håndtere klik-events
// Den bruges til at skifte til 'opret'-fanebladet
export function OpretOevelseKnap() {
  // Håndterer klik på knappen ved at finde 'opret'-fanebladet og klikke på det
  const skiftTilOpretFaneblad = () => {
    // Finder fanebladet med værdien 'opret' og simulerer et klik
    const opretFaneblad = document.querySelector('[value="opret"]') as HTMLElement;
    if (opretFaneblad) {
      opretFaneblad.click();
    }
  };

  return (
    <Button onClick={skiftTilOpretFaneblad}>
      <Plus className="mr-2 h-4 w-4" />
      Opret din første øvelse
    </Button>
  );
} 