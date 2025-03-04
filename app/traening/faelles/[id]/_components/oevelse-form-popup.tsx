'use client';

import { useState, useEffect } from 'react';
import { OevelseForm } from '@/app/traening/oevelser/_components/oevelse-form';
import { hentAllePositioner, hentAlleKategorier, hentAlleFokuspunkter, hentOevelse } from '@/lib/db/actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { tilfoejOevelseTilTraening } from '../actions';
import { Button } from '@/components/ui/button';

// # Interface der definerer props til OevelseFormPopup komponenten
interface OevelseFormPopupProps {
  traeningId: number;
  onSuccess: (oevelseId: number, oevelseNavn: string) => void;
  onCancel: () => void;
}

// # Komponent til at oprette en ny øvelse direkte fra træningsoversigten
export function OevelseFormPopup({ traeningId, onSuccess, onCancel }: OevelseFormPopupProps) {
  // # State til at holde styr på om vi er ved at indlæse data
  const [indlaeser, setIndlaeser] = useState(true);
  // # State til at holde styr på om vi er ved at indsende formularen
  const [indsender, setIndsender] = useState(false);
  // # State til at holde formdata
  const [offensivePositioner, setOffensivePositioner] = useState<string[]>([]);
  const [defensivePositioner, setDefensivePositioner] = useState<string[]>([]);
  const [kategorier, setKategorier] = useState<string[]>([]);
  const [fokuspunkter, setFokuspunkter] = useState<string[]>([]);
  // # Router til at kunne navigere
  const router = useRouter();

  // # Hent nødvendige data ved komponentoprettelse
  useEffect(() => {
    async function hentData() {
      try {
        // # Hent alle positioner, kategorier og fokuspunkter
        const [positionData, kategoriData, fokuspunktData] = await Promise.all([
          hentAllePositioner(),
          hentAlleKategorier(),
          hentAlleFokuspunkter()
        ]);

        // # Opdel positioner i offensive og defensive
        setOffensivePositioner(Array.from(positionData.offensive));
        setDefensivePositioner(Array.from(positionData.defensive));
        setKategorier(kategoriData.map(k => k.navn));
        setFokuspunkter(fokuspunktData.map(f => f.tekst));
        
        // # Færdig med indlæsning
        setIndlaeser(false);
      } catch (error) {
        console.error("Fejl ved hentning af data til øvelsesformular:", error);
        toast.error("Der opstod en fejl ved hentning af data");
        onCancel(); // # Annuller hvis der sker en fejl
      }
    }

    hentData();
  }, [onCancel]);

  // # Lytter til indsendelse af formularen
  useEffect(() => {
    const oevelseForm = document.getElementById('oevelse-form');
    if (oevelseForm) {
      const handleSubmit = () => {
        setIndsender(true);
      };
      oevelseForm.addEventListener('submit', handleSubmit);
      return () => {
        oevelseForm.removeEventListener('submit', handleSubmit);
      };
    }
  }, []);

  // # Overriding router.push
  const originalPush = router.push;
  useEffect(() => {
    // # Overstyr OevelseForm ved at udskifte router.push med vores egen håndtering
    router.push = (url: string) => {
      // # Hent ID fra URL (format: /traening/oevelser/123)
      const matches = url.match(/\/traening\/oevelser\/(\d+)/);
      if (matches && matches[1]) {
        const oevelseId = parseInt(matches[1], 10);
        
        // # Først hent øvelsen for at få detaljer
        hentOevelse(oevelseId).then(async (oevelse) => {
          if (!oevelse) {
            throw new Error("Kunne ikke finde den oprettede øvelse");
          }
          
          // # Tilføj øvelsen til træningen
          await tilfoejOevelseTilTraening({
            traeningId,
            oevelseId
          });
          
          // # Meld tilbage, at det lykkedes
          onSuccess(oevelseId, oevelse.navn);
        }).catch((error) => {
          console.error("Fejl ved tilføjelse af øvelse til træning:", error);
          toast.error("Der opstod en fejl ved tilføjelse af øvelse til træning");
          setIndsender(false);
        });
        
        // # Vend tilbage fra redirectionen, da vi håndterer det selv
        return Promise.resolve();
      }
      
      // # Fallback til normal router.push for andre URLs
      return originalPush(url);
    };
    
    // # Ryd op når komponenten unmountes
    return () => {
      router.push = originalPush;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traeningId, onSuccess]);

  // # Viser loading-indikator mens data indlæses
  if (indlaeser) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>Indlæser formular...</p>
      </div>
    );
  }

  // # Vis formularen for at oprette en øvelse
  return (
    <div className="w-full">
      <div className="max-h-[65vh] overflow-y-auto px-1 mb-4">
        <OevelseForm 
          offensivePositioner={offensivePositioner}
          defensivePositioner={defensivePositioner}
          kategorier={kategorier}
          fokuspunkter={fokuspunkter}
        />
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={indsender}>
          Annuller
        </Button>
        <Button type="submit" form="oevelse-form" disabled={indsender}>
          {indsender ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Opretter øvelse...
            </>
          ) : (
            <>Opret øvelse</>
          )}
        </Button>
      </div>
    </div>
  );
} 