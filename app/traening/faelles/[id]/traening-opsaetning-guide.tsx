"use client";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface TraeningOpsaetningGuideProps {
  tilmeldteHold: Array<{hold_id: number, hold_navn: string}>;
  tilstedevaerelsesData: any[];
  traeningId: number;
}

// # Nøgle til at gemme skjul-status i localStorage - gøres tilgængelig for begge komponenter
export const TRAENING_OPSAETNING_SKJULT_KEY = 'traening-opsaetning-guide-skjult';

export function TraeningOpsaetningGuide({ tilmeldteHold, tilstedevaerelsesData, traeningId }: TraeningOpsaetningGuideProps) {
  // # Tjek om guiden skal vises baseret på localStorage og/eller om alle trin er udført
  const [skjult, setSkjult] = useState(false);
  const [oevelserUdfoert, setOevelserUdfoert] = useState(false);
  
  // # Indlæs brugerens præference fra localStorage ved opstart
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // # Generel indstilling for at skjule guiden
      const skjultGemtVaerdi = localStorage.getItem(TRAENING_OPSAETNING_SKJULT_KEY);
      if (skjultGemtVaerdi) {
        setSkjult(JSON.parse(skjultGemtVaerdi));
      }
      
      // # Tjek om øvelsestrinnet er udført for denne træning
      const oevelserUdfoertKey = `traening-${traeningId}-oevelser-udfoert`;
      const oevelserUdfoertVaerdi = localStorage.getItem(oevelserUdfoertKey);
      if (oevelserUdfoertVaerdi) {
        setOevelserUdfoert(JSON.parse(oevelserUdfoertVaerdi));
      }
      
      // # Tjek om URL'en indikerer at vi kommer fra "administrer træning"
      const referrer = document.referrer;
      if (referrer && referrer.includes('/traening/') && !referrer.includes('/faelles/')) {
        // # Hvis vi kommer fra administrer træning, skal vejledningen skjules
        localStorage.setItem(TRAENING_OPSAETNING_SKJULT_KEY, 'true');
        setSkjult(true);
      }
      
      // # Hvis brugeren har været på øvelsestab'en, marker det som udført
      const handleTabChange = () => {
        // # Tjek om den aktive tab er "traening" (øvelser)
        if (typeof document !== 'undefined') { // Sikrer at vi kun kører i browser-miljø
          const aktivTab = document.querySelector('[data-state="active"][data-radix-collection-item]');
          if (aktivTab && aktivTab.getAttribute('value') === 'traening') {
            localStorage.setItem(oevelserUdfoertKey, 'true');
            setOevelserUdfoert(true);
          }
        }
      };
      
      // # Lyt efter ændringer i localStorage for at holde begge vejledninger synkroniseret
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === TRAENING_OPSAETNING_SKJULT_KEY) {
          setSkjult(event.newValue === 'true');
        }
      };
      
      // # Tilføj event listeners, men kun i browser-miljø
      document.addEventListener('click', handleTabChange);
      window.addEventListener('storage', handleStorageChange);
      
      // # Cleanup event listeners
      return () => {
        document.removeEventListener('click', handleTabChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [traeningId]);
  
  // # Gem brugerens valg i localStorage når det ændres
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TRAENING_OPSAETNING_SKJULT_KEY, JSON.stringify(skjult));
      
      // # Udløs en custom event for at opdatere andre komponenter der bruger samme skjul-status
      const event = new Event('storage');
      window.dispatchEvent(event);
    }
  }, [skjult]);
  
  // # Tjek om alle trin er udført
  const alleTrinUdfoert = tilmeldteHold.length > 0 && tilstedevaerelsesData.length > 0 && oevelserUdfoert;
  
  // # Skjul automatisk guiden, hvis alle trin er udført
  useEffect(() => {
    if (alleTrinUdfoert && typeof window !== 'undefined') {
      // # Vent lidt før vi skjuler guiden, så brugeren kan se at alle trin er udført
      const timeout = setTimeout(() => {
        setSkjult(true);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [alleTrinUdfoert]);
  
  // # Hvis guiden er markeret som skjult, vis ingenting
  if (skjult) {
    return null;
  }
  
  // # Funktion til at lukke guiden
  const lukGuide = () => {
    setSkjult(true);
  };
  
  return (
    <div className="bg-muted p-4 rounded-lg border border-border relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-2" 
        onClick={lukGuide}
      >
        <XIcon className="h-4 w-4" />
      </Button>
      <h2 className="font-medium mb-2">Træningsopsætning</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Følg disse trin for at opsætte din træning. Du kan altid vende tilbage og redigere disse oplysninger senere.
      </p>
      
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-md flex flex-col items-center bg-primary/20 border-primary border">
          <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1 bg-primary text-primary-foreground">1</div>
          <span>Detaljer</span>
        </div>
        <div className={`p-2 rounded-md flex flex-col items-center ${tilmeldteHold.length > 0 ? "bg-primary/20 border-primary border" : "bg-muted"}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${tilmeldteHold.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30"}`}>2</div>
          <span>Tilmeld hold</span>
        </div>
        <div className={`p-2 rounded-md flex flex-col items-center ${tilstedevaerelsesData.length > 0 ? "bg-primary/20 border-primary border" : "bg-muted"}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${tilstedevaerelsesData.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30"}`}>3</div>
          <span>Spillere</span>
        </div>
        <div className={`p-2 rounded-md flex flex-col items-center ${oevelserUdfoert ? "bg-primary/20 border-primary border" : "bg-muted"}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${oevelserUdfoert ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30"}`}>4</div>
          <span>Øvelser</span>
        </div>
      </div>
    </div>
  );
} 