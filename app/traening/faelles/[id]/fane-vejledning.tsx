"use client";

import { useEffect, useState } from "react";
import { TRAENING_OPSAETNING_SKJULT_KEY } from "./traening-opsaetning-guide";

export function FaneVejledning({ traeningId }: { traeningId: number }) {
  // # Tjek om vejledningen skal vises baseret på localStorage
  const [skjult, setSkjult] = useState(false);
  
  // # Indlæs brugerens præference fra localStorage ved opstart
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // # Brug samme nøgle som træningsopsætningsvejledningen
      const skjultGemtVaerdi = localStorage.getItem(TRAENING_OPSAETNING_SKJULT_KEY);
      if (skjultGemtVaerdi) {
        setSkjult(JSON.parse(skjultGemtVaerdi));
      }
      
      // # Tjek om URL'en indikerer at vi kommer fra "administrer træning"
      const referrer = document.referrer;
      if (referrer && referrer.includes('/traening/') && !referrer.includes('/faelles/')) {
        // # Hvis vi kommer fra administrer træning, skal vejledningen skjules
        localStorage.setItem(TRAENING_OPSAETNING_SKJULT_KEY, 'true');
        setSkjult(true);
      }
      
      // # Lyt efter ændringer i localStorage for at holde begge vejledninger synkroniseret
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === TRAENING_OPSAETNING_SKJULT_KEY) {
          setSkjult(event.newValue === 'true');
        }
      };
      
      // # Lyt også efter custom events fra TraeningOpsaetningGuide
      const handleCustomStorageEvent = () => {
        const skjultVaerdi = localStorage.getItem(TRAENING_OPSAETNING_SKJULT_KEY);
        if (skjultVaerdi) {
          setSkjult(JSON.parse(skjultVaerdi));
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('storage', handleCustomStorageEvent);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('storage', handleCustomStorageEvent);
      };
    }
  }, []);
  
  // # Hvis vejledningen er markeret som skjult, vis ingenting
  if (skjult) {
    return null;
  }
  
  return (
    <div className="bg-muted p-3 rounded-md mb-2 text-sm border border-border">
      <p>
        <strong>Gå igennem hver fane for at opsætte træningen:</strong>
      </p>
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li><strong>Træning:</strong> Tilføj og organiser øvelser</li>
        <li><strong>Detaljer:</strong> Se og rediger træningens grundlæggende oplysninger</li>
        <li><strong>Deltagere:</strong> Registrer hvilke spillere der deltager</li>
        <li><strong>Hold:</strong> Tilmeld hold til denne træning</li>
      </ul>
    </div>
  );
} 