'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, ChevronDown, Plus, Edit, Search, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  hentTraeningOevelser, 
  tilfoejOevelseTilTraening, 
  fjernOevelseFraTraening, 
  opdaterAlleTraeningOevelsePositioner,
  opdaterLokalTraeningOevelse,
  hentTraeningOevelseFokuspunkter,
  hentTraeningDeltagere,
  tilfoejAlleTilstedevaerende,
  hentOevelseDeltagere,
  tilfoejDeltagereOevelse
} from "./actions";
import { hentAlleOevelser, hentAlleKategorier, hentAlleFokuspunkter, hentOevelseFokuspunkter } from "@/lib/db/actions";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OevelseFormPopup } from './_components/oevelse-form-popup';
import { OevelseRedigerForm } from './_components/oevelse-rediger-form';
import { OevelseDeltagereForm } from './_components/oevelse-deltagere-form';
import { DeltagerValgModal } from './_components/deltager-valg-modal';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// # Interface til at definere props til komponenten
interface TraeningModulProps {
  traeningId: number;
}

// # Type til øvelser
interface Oevelse {
  id: number;
  navn: string;
  beskrivelse?: string | null;
  kategoriNavn?: string | null;
  billedeSti?: string | null;
  brugerPositioner: boolean;
  minimumDeltagere?: number | null;
}

// # Type til en træningsøvelse med position
interface TraeningOevelse {
  id: number;
  traeningId: number;
  oevelseId: number;
  position: number;
  oevelse: {
    id: number;
    navn: string;
    beskrivelse: string | null;
    billedeSti: string | null;
    brugerPositioner: boolean;
    minimumDeltagere: number | null;
    kategoriNavn: string | null;
  };
}

// # Type til en deltager
interface Deltager {
  spillerId: number;
  navn: string;
  nummer: number | null;
  erMV: boolean;
  holdId: number;
  holdNavn: string;
}

// # Hovedkomponent for visning og håndtering af træning med moduler
export function TraeningModul({ traeningId }: TraeningModulProps) {
  // # Router til navigation
  const router = useRouter();
  
  // # State til at holde styr på øvelser tilknyttet til træningen
  const [traeningOevelser, setTraeningOevelser] = useState<TraeningOevelse[]>([]);
  // # State til at holde styr på alle tilgængelige øvelser
  const [alleOevelser, setAlleOevelser] = useState<Oevelse[]>([]);
  // # State til at holde styr på filtrerede øvelser ved søgning
  const [filteredeOevelser, setFilteredeOevelser] = useState<Oevelse[]>([]);
  // # State til at holde styr på om vi viser dialogen til at tilføje øvelser
  const [visOevelsesDialog, setVisOevelsesDialog] = useState(false);
  // # State til at holde styr på om vi viser "Opret" eller "Find" øvelse eller vælger deltagere
  const [dialogTilstand, setDialogTilstand] = useState<'menu' | 'opret' | 'find' | 'vaelg-deltagere'>('menu');
  // # State til at holde styr på om vi er ved at indlæse data
  const [indlaeser, setIndlaeser] = useState(true);
  // # State til at holde styr på søgeord
  const [soegeord, setSoegeord] = useState('');
  // # State til at holde styr på om vi er ved at udføre en handling
  const [udfoerendeHandling, setUdfoerendeHandling] = useState(false);
  // # State til at holde styr på hvilken øvelse der er udvidet
  const [udvidetOevelseId, setUdvidetOevelseId] = useState<number | null>(null);
  // # State til at holde alle kategorier
  const [alleKategorier, setAlleKategorier] = useState<string[]>([]);
  // # State til at holde alle fokuspunkter
  const [alleFokuspunkter, setAlleFokuspunkter] = useState<string[]>([]);
  // # State til at holde aktuelle fokuspunkter for den udvidede øvelse
  const [aktuelleOevelseFokuspunkter, setAktuelleOevelseFokuspunkter] = useState<string[]>([]);
  // # State til at holde styr på om vi indlæser fokuspunkter
  const [indlaeserFokuspunkter, setIndlaeserFokuspunkter] = useState(false);
  // # State til at holde styr på tilstedeværende deltagere
  const [tilstedevaerende, setTilstedevaerende] = useState<Deltager[]>([]);
  
  // # Nye state-variabler til deltagervalg inden øvelse tilføjes
  const [deltagerValgOpen, setDeltagerValgOpen] = useState(false);
  const [deltagerValgLadning, setDeltagerValgLadning] = useState(false);
  const [valgteTilstedevaerende, setValgteTilstedevaerende] = useState(true);
  // # State til at holde styr på valgte individuelle deltagere
  const [valgteIndividuelleDeltagere, setValgteIndividuelleDeltagere] = useState<number[]>([]);
  
  // # Hent data når komponenten indlæses
  useEffect(() => {
    // # Indlæs data
    const hentData = async () => {
      setIndlaeser(true);
      try {
        // # Hent træningsøvelser
        const oevelser = await hentTraeningOevelser(traeningId);
        setTraeningOevelser(oevelser as TraeningOevelse[]);
        
        // # Hent alle øvelser til tilføjelse
        const alleOev = await hentAlleOevelser();
        setAlleOevelser(alleOev);
        setFilteredeOevelser(alleOev);
        
        // # Hent alle kategorier
        const kategorier = await hentAlleKategorier();
        setAlleKategorier(kategorier.map(k => k.navn));
        
        // # Hent alle fokuspunkter
        const fokuspunkter = await hentAlleFokuspunkter();
        setAlleFokuspunkter(fokuspunkter.map(f => f.tekst));
        
        // # Hent tilstedeværende deltagere
        try {
          const deltagere = await hentTraeningDeltagere(traeningId);
          const tilstedeSpillere = deltagere
            .filter(d => d.tilstede)
            .map(d => ({
              spillerId: d.spillerId,
              navn: d.navn,
              nummer: d.nummer,
              erMV: d.erMaalMand,
              holdId: d.holdId,
              holdNavn: d.holdNavn
            }));
          setTilstedevaerende(tilstedeSpillere);
        } catch (error) {
          console.error("Fejl ved hentning af deltagere:", error);
          toast.error("Der opstod en fejl ved hentning af deltagere");
        }
        
        setIndlaeser(false);
      } catch (error) {
        console.error("Fejl ved indlæsning af data:", error);
        toast.error("Der opstod en fejl ved indlæsning af data");
        setIndlaeser(false);
      }
    };
    
    hentData();
  }, [traeningId]);
  
  // # Filtrer øvelser baseret på søgeord
  useEffect(() => {
    if (soegeord.trim() === '') {
      setFilteredeOevelser(alleOevelser);
    } else {
      const soegOrd = soegeord.toLowerCase();
      const filtrerede = alleOevelser.filter(oevelse => 
        oevelse.navn.toLowerCase().includes(soegOrd) || 
        (oevelse.beskrivelse && oevelse.beskrivelse.toLowerCase().includes(soegOrd)) ||
        (oevelse.kategoriNavn && oevelse.kategoriNavn.toLowerCase().includes(soegOrd))
      );
      setFilteredeOevelser(filtrerede);
    }
  }, [soegeord, alleOevelser]);
  
  // # Flyt en øvelse op i rækkefølgen
  const flytOevelseOp = async (index: number) => {
    if (index <= 0) return; // # Kan ikke flyttes op hvis den allerede er i toppen
    
    try {
      setUdfoerendeHandling(true);
      
      // # Lav en kopi af arrayet
      const nyTraeningOevelser = [...traeningOevelser];
      // # Byt om på elementerne
      [nyTraeningOevelser[index], nyTraeningOevelser[index - 1]] = 
      [nyTraeningOevelser[index - 1], nyTraeningOevelser[index]];
      // # Opdater positionerne
      nyTraeningOevelser.forEach((oevelse, idx) => {
        oevelse.position = idx + 1;
      });
      
      // # Opdater state
      setTraeningOevelser(nyTraeningOevelser);
      
      // # Opdater positioner i databasen
      await opdaterAlleTraeningOevelsePositioner(
        traeningId, 
        nyTraeningOevelser.map(o => ({ id: o.id, position: o.position }))
      );
      
      setUdfoerendeHandling(false);
      toast.success("Øvelsesrækkefølge opdateret");
    } catch (error) {
      console.error("Fejl ved flytning af øvelse:", error);
      toast.error("Der opstod en fejl ved flytning af øvelse");
      setUdfoerendeHandling(false);
      
      // # Genindlæs øvelser for at sikre korrekt rækkefølge
      const oevelser = await hentTraeningOevelser(traeningId);
      setTraeningOevelser(oevelser as TraeningOevelse[]);
    }
  };
  
  // # Flyt en øvelse ned i rækkefølgen
  const flytOevelseNed = async (index: number) => {
    if (index >= traeningOevelser.length - 1) return; // # Kan ikke flyttes ned hvis den allerede er i bunden
    
    try {
      setUdfoerendeHandling(true);
      
      // # Lav en kopi af arrayet
      const nyTraeningOevelser = [...traeningOevelser];
      // # Byt om på elementerne
      [nyTraeningOevelser[index], nyTraeningOevelser[index + 1]] = 
      [nyTraeningOevelser[index + 1], nyTraeningOevelser[index]];
      // # Opdater positionerne
      nyTraeningOevelser.forEach((oevelse, idx) => {
        oevelse.position = idx + 1;
      });
      
      // # Opdater state
      setTraeningOevelser(nyTraeningOevelser);
      
      // # Opdater positioner i databasen
      await opdaterAlleTraeningOevelsePositioner(
        traeningId, 
        nyTraeningOevelser.map(o => ({ id: o.id, position: o.position }))
      );
      
      setUdfoerendeHandling(false);
      toast.success("Øvelsesrækkefølge opdateret");
    } catch (error) {
      console.error("Fejl ved flytning af øvelse:", error);
      toast.error("Der opstod en fejl ved flytning af øvelse");
      setUdfoerendeHandling(false);
      
      // # Genindlæs øvelser for at sikre korrekt rækkefølge
      const oevelser = await hentTraeningOevelser(traeningId);
      setTraeningOevelser(oevelser as TraeningOevelse[]);
    }
  };
  
  // # Fjern en øvelse fra træningen
  const fjernOevelse = async (id: number) => {
    try {
      setUdfoerendeHandling(true);
      
      // # Fjern øvelsen fra databasen
      await fjernOevelseFraTraening(id);
      
      // # Filtrer øvelsen ud
      const nyTraeningOevelser = traeningOevelser.filter(oevelse => oevelse.id !== id);
      
      // # Opdater state
      setTraeningOevelser(nyTraeningOevelser);
      
      setUdfoerendeHandling(false);
      toast.success("Øvelse fjernet fra træningen");
    } catch (error) {
      console.error("Fejl ved fjernelse af øvelse:", error);
      toast.error("Der opstod en fejl ved fjernelse af øvelse");
      setUdfoerendeHandling(false);
      
      // # Genindlæs øvelser for at sikre korrekt data
      const oevelser = await hentTraeningOevelser(traeningId);
      setTraeningOevelser(oevelser as TraeningOevelse[]);
    }
  };
  
  // # Tilføj en øvelse til træningen
  const tilfoejOevelse = async (oevelse: Oevelse) => {
    try {
      setUdfoerendeHandling(true);

      console.log("Tilføj øvelse data:", oevelse);
      console.log("Valgte alle tilstedeværende:", valgteTilstedevaerende);
      console.log("Valgte individuelle deltagere:", valgteIndividuelleDeltagere);

      // # Tilføj øvelsen til træningen
      const id = await tilfoejOevelseTilTraening({
        traeningId,
        oevelseId: oevelse.id
      });
      
      if (id) {
        // # Hvis "Alle tilstedeværende" er valgt, tilføj dem til øvelsen
        if (valgteTilstedevaerende) {
          console.log("Tilføjer alle tilstedeværende til øvelsen");
          await tilfoejAlleTilstedevaerende(id);
        } 
        // # Hvis individuelle deltagere er valgt, tilføj dem til øvelsen
        else if (valgteIndividuelleDeltagere.length > 0) {
          console.log(`Tilføjer ${valgteIndividuelleDeltagere.length} individuelle deltagere til øvelsen`);
          
          try {
            const result = await tilfoejDeltagereOevelse(id, valgteIndividuelleDeltagere);
            console.log("Resultat af tilføjelse af deltagere:", result);
            toast.success(`${valgteIndividuelleDeltagere.length} deltagere tilføjet til øvelsen`);
          } catch (error) {
            console.error("Fejl ved tilføjelse af individuelle deltagere:", error);
            toast.error("Der skete en fejl ved tilføjelse af deltagere");
          }
        }
        
        // # Genindlæs øvelser
        await genindlaesOevelser();
      }
      
      // # Luk dialog og nulstil tilstand
      setVisOevelsesDialog(false);
      setDialogTilstand('menu');
      setValgteIndividuelleDeltagere([]);
      
      toast.success(`Øvelse "${oevelse.navn}" tilføjet til træningen`);
      
      return id; // # Returner ID for at kunne tilføje deltagere
    } catch (error) {
      console.error("Fejl ved tilføjelse af øvelse:", error);
      toast.error("Der opstod en fejl ved tilføjelse af øvelse");
      setUdfoerendeHandling(false);
      return null;
    }
  };
  
  // # Håndter dialog-valg
  const haandterDialogValg = (valg: 'opret' | 'find' | 'vaelg-deltagere') => {
    setDialogTilstand(valg);
  };
  
  // # Nulstil dialog når den lukkes
  const nulstilDialog = () => {
    setDialogTilstand('menu');
    setSoegeord('');
    setValgteTilstedevaerende(true);
  };
  
  // # Nye funktioner til at håndtere deltagervalg
  
  // # Vis dialogen til at vælge deltagere
  const startOevelsesTilfoejelse = () => {
    // # Åbn deltagervalgs-dialogen først
    setDeltagerValgOpen(true);
  };
  
  // # Håndter klik på "Alle tilstedeværende" i deltager-valg-modal
  const haandterVaelgAlleTilstedevaerende = useCallback(async () => {
    try {
      setDeltagerValgLadning(true);
      console.log("Vælger alle tilstedeværende deltagere");
      setValgteTilstedevaerende(true);
      setDeltagerValgOpen(false);
      
      // Vent et øjeblik før øvelsesdialogen åbnes for bedre brugeroplevelse
      setTimeout(() => {
        // Åbn øvelsesdialogen og sæt den til 'menu' tilstand
        setDialogTilstand('menu');
        setVisOevelsesDialog(true);
      }, 150);
    } catch (error) {
      console.error("Fejl ved valg af alle tilstedeværende:", error);
      toast.error("Der skete en fejl ved valg af alle tilstedeværende");
    } finally {
      setDeltagerValgLadning(false);
    }
  }, []);
  
  // # Håndterer klik på "Vælg deltagere" i deltager-valg-modal
  const haandterVaelgIndividuelle = useCallback(async () => {
    try {
      setDeltagerValgLadning(true);
      console.log("Åbner for individuel udvælgelse af deltagere");
      setValgteTilstedevaerende(false);
      setDeltagerValgOpen(false);
      
      // Nulstil valgte individuelle deltagere
      setValgteIndividuelleDeltagere([]);
      
      // Vent et øjeblik før deltagerudvælgelsesdialogen åbnes for bedre brugeroplevelse
      setTimeout(() => {
        // Vis deltagerudvælgelsesdialogen
        setDialogTilstand('vaelg-deltagere');
        setVisOevelsesDialog(true);
      }, 150);
    } catch (error) {
      console.error("Fejl ved åbning af individuel udvælgelse:", error);
      toast.error("Der skete en fejl ved åbning af individuel udvælgelse");
    } finally {
      setDeltagerValgLadning(false);
    }
  }, []);
  
  // Funktion til at fortsætte til øvelsesvalg efter deltagerudvælgelse
  const fortsaetTilOevelsesvalg = () => {
    if (valgteIndividuelleDeltagere.length === 0) {
      toast.error("Du skal vælge mindst én deltager");
      return;
    }
    
    // Skift til øvelsesvalg-menuen
    setDialogTilstand('menu');
  };
  
  // Funktion til at håndtere check/uncheck af en deltager
  const haandterDeltagerValg = (spillerId: number, checked: boolean) => {
    if (checked) {
      // Tilføj til valgte deltagere hvis ikke allerede valgt
      if (!valgteIndividuelleDeltagere.includes(spillerId)) {
        setValgteIndividuelleDeltagere([...valgteIndividuelleDeltagere, spillerId]);
      }
    } else {
      // Fjern fra valgte deltagere
      setValgteIndividuelleDeltagere(valgteIndividuelleDeltagere.filter(id => id !== spillerId));
    }
  };
  
  // # Genindlæs øvelser
  const genindlaesOevelser = async () => {
    try {
      console.log("Genindlæser øvelser...");
      const opdateredeOevelser = await hentTraeningOevelser(traeningId);
      
      setTraeningOevelser(opdateredeOevelser as TraeningOevelse[]);
      console.log("Øvelser genindlæst:", opdateredeOevelser);
    } catch (error) {
      console.error("Fejl ved genindlæsning af øvelser:", error);
    }
  };

  // # Tilføj alle tilstedeværende til en øvelse
  const tilfoejAlleTilstedevaerende = async (traeningOevelseId: number) => {
    try {
      console.log(`Tilføjer alle tilstedeværende til øvelse med ID: ${traeningOevelseId}`);
      setUdfoerendeHandling(true);
      
      // # Kald funktion der tilføjer alle tilstedeværende deltagere
      const resultat = await import('./actions').then(mod => 
        mod.tilfoejAlleTilstedevaerende(traeningOevelseId, traeningId)
      );
      
      if (resultat && resultat.success) {
        console.log("Tilføjede alle tilstedeværende deltagere:", resultat);
        toast.success(`Tilføjede ${resultat.count} tilstedeværende deltagere`);
        // # Opdater deltagerlisten
        await genindlaesOevelser();
      } else {
        console.error("Fejl ved tilføjelse af alle tilstedeværende");
        toast.error("Der skete en fejl ved tilføjelse af deltagere");
      }
    } catch (error) {
      console.error("Fejl ved tilføjelse af alle tilstedeværende:", error);
      toast.error("Der skete en fejl ved tilføjelse af deltagere");
    } finally {
      setUdfoerendeHandling(false);
    }
  };
  
  // # Håndter succesfuld oprettelse af øvelse
  const haandterOpretOevelseSuccess = async (oevelseId: number, oevelseNavn: string) => {
    try {
      console.log(`Øvelse "${oevelseNavn}" (ID: ${oevelseId}) oprettet`);
      
      // # Opret en ny træningsøvelse
      const nyTraeningOevelse: TraeningOevelse = {
        id: -1, // # Midlertidigt ID, vil blive opdateret ved genindlæsning
        traeningId,
        oevelseId: oevelseId,
        position: traeningOevelser.length + 1,
        oevelse: {
          id: oevelseId,
          navn: oevelseNavn,
          beskrivelse: null,
          billedeSti: null,
          brugerPositioner: false,
          minimumDeltagere: null,
          kategoriNavn: null,
        }
      };
      
      // # Tilføj til listen
      setTraeningOevelser([...traeningOevelser, nyTraeningOevelse]);
      
      // # Luk dialogen
      setVisOevelsesDialog(false);
      setDialogTilstand('menu');
      
      // # Vis bekræftelse
      toast.success(`Øvelse "${oevelseNavn}" oprettet og tilføjet til træningen`);
      
      // # Genindlæs øvelser for at få korrekte data og ID
      console.log("Genindlæser træningsøvelser for at få korrekt ID");
      const oevelser = await hentTraeningOevelser(traeningId);
      const opdateredeOevelser = oevelser as TraeningOevelse[];
      setTraeningOevelser(opdateredeOevelser);
      
      // # Find det opdaterede ID for den øvelse vi lige har tilføjet
      const nyOevelseId = opdateredeOevelser.find(o => o.oevelseId === oevelseId)?.id;
      
      // # Hvis "Alle deltager" blev valgt og øvelses-ID blev oprettet korrekt
      if (valgteTilstedevaerende && nyOevelseId) {
        console.log(`Tilføjer alle tilstedeværende til ny øvelse (ID: ${nyOevelseId})`);
        await tilfoejAlleTilstedevaerende(nyOevelseId);
      } else {
        console.log("Ingen automatisk tilføjelse af deltagere til øvelsen");
      }
    } catch (error) {
      console.error("Fejl ved håndtering af øvelsesoprettelse:", error);
      toast.error("Der opstod en fejl ved tilføjelse af øvelsen");
    }
  };
  
  // # Udvid eller sammentræk en øvelse
  const toggleOevelseUdvidelse = async (id: number) => {
    if (udvidetOevelseId === id) {
      // # Hvis den samme øvelse allerede er udvidet, luk den
      setUdvidetOevelseId(null);
      setAktuelleOevelseFokuspunkter([]);
    } else {
      // # Ellers åbn denne øvelse og hent dens fokuspunkter
      setUdvidetOevelseId(id);
      
      // # Indlæs fokuspunkter for denne træningsøvelse
      setIndlaeserFokuspunkter(true);
      try {
        const fokuspunkter = await hentTraeningOevelseFokuspunkter(id);
        setAktuelleOevelseFokuspunkter(fokuspunkter.map(fp => fp.tekst));
      } catch (error) {
        console.error("Fejl ved indlæsning af fokuspunkter:", error);
        toast.error("Kunne ikke indlæse fokuspunkter");
      } finally {
        setIndlaeserFokuspunkter(false);
      }
    }
  };
  
  // # Håndter succesfuld redigering af en øvelse
  const haandterRedigeringSuccess = async (opdateretNavn: string, opdateretKategori: string | null, opdateretBeskrivelse: string | null, nyeFokuspunkter?: string[]) => {
    if (!udvidetOevelseId) return;
    
    try {
      // # Gem lokale ændringer i databasen
      await opdaterLokalTraeningOevelse({
        id: udvidetOevelseId,
        navn: opdateretNavn,
        beskrivelse: opdateretBeskrivelse,
        kategoriNavn: opdateretKategori,
        fokuspunkter: nyeFokuspunkter || []
      });
      
      toast.success("Ændringer gemt");
      
      // # Opdater øvelsen i den lokale state
      const opdateredeOevelser = traeningOevelser.map(trainingExercise => {
        if (trainingExercise.id === udvidetOevelseId) {
          return {
            ...trainingExercise,
            oevelse: {
              ...trainingExercise.oevelse,
              navn: opdateretNavn,
              kategoriNavn: opdateretKategori,
              beskrivelse: opdateretBeskrivelse
            }
          };
        }
        return trainingExercise;
      });
      
      // # Opdater state
      setTraeningOevelser(opdateredeOevelser);
      
      // # Tilføj den nye kategori til listen af kategorier, hvis den ikke allerede findes
      if (opdateretKategori && !alleKategorier.includes(opdateretKategori)) {
        setAlleKategorier(prev => [...prev, opdateretKategori]);
        console.log(`Tilføjet ny kategori "${opdateretKategori}" til listen af kategorier`);
      }
      
      // # Tilføj nye fokuspunkter til listen af fokuspunkter, hvis de ikke allerede findes
      if (nyeFokuspunkter && nyeFokuspunkter.length > 0) {
        const opdateretFokuspunkter = [...alleFokuspunkter];
        let fokuspunkterTilfojet = false;
        
        nyeFokuspunkter.forEach(fokuspunkt => {
          if (!opdateretFokuspunkter.includes(fokuspunkt)) {
            opdateretFokuspunkter.push(fokuspunkt);
            fokuspunkterTilfojet = true;
          }
        });
        
        if (fokuspunkterTilfojet) {
          setAlleFokuspunkter(opdateretFokuspunkter);
          console.log(`Tilføjet ${nyeFokuspunkter.length} nye fokuspunkter til listen af fokuspunkter`);
        }
      }
      
      // # Luk udvidelsen
      setUdvidetOevelseId(null);
    } catch (error) {
      console.error("Fejl ved opdatering af øvelse:", error);
      toast.error("Kunne ikke gemme ændringer");
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Træningsøvelser</h2>
        
        {/* Deltagervalgs-dialog */}
        <DeltagerValgModal 
          aaben={deltagerValgOpen}
          onClose={() => setDeltagerValgOpen(false)}
          onVaelgTilstedevaerende={haandterVaelgAlleTilstedevaerende}
          onVaelgIndividuelle={haandterVaelgIndividuelle}
          ladning={deltagerValgLadning}
        />
        
        {/* Knap til at starte processen - uafhængig af dialog-komponenterne */}
        <Button onClick={startOevelsesTilfoejelse}>
          <Plus className="mr-2 h-4 w-4" />
          Tilføj øvelse
        </Button>
        
        {/* Øvelses-dialog - Helt separat fra knappen */}
        <Dialog 
          open={visOevelsesDialog} 
          onOpenChange={(open) => {
            setVisOevelsesDialog(open);
            if (!open) {
              nulstilDialog();
            }
          }}
        >
          <DialogContent 
            className={dialogTilstand === 'opret' ? "sm:max-w-4xl" : "sm:max-w-md"}
            style={dialogTilstand === 'opret' ? { maxHeight: '90vh', height: 'auto' } : {}}
          >
            <DialogHeader>
              <DialogTitle>
                {dialogTilstand === 'menu' ? 'Tilføj øvelse til træning' : 
                 dialogTilstand === 'opret' ? 'Opret ny øvelse' : 
                 dialogTilstand === 'find' ? 'Find øvelse' : 'Vælg deltagere'}
              </DialogTitle>
              <DialogDescription>
                {dialogTilstand === 'menu' ? 'Vælg om du vil oprette en ny øvelse eller finde en eksisterende' : 
                 dialogTilstand === 'opret' ? 'Udfyld formularen for at oprette en ny øvelse' : 
                 dialogTilstand === 'find' ? 'Søg efter en eksisterende øvelse' : 'Vælg deltagere'}
              </DialogDescription>
            </DialogHeader>
            
            {dialogTilstand === 'menu' && (
              <div className="grid grid-cols-2 gap-6">
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-start border-2 p-0 h-auto overflow-hidden hover:bg-gray-50"
                  onClick={() => haandterDialogValg('opret')}
                >
                  <div className="w-full bg-gray-50 p-4 border-b">
                    <Plus className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="p-4 w-full flex flex-col items-center">
                    <span className="font-semibold text-base mb-2">Opret øvelse</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Opret en helt ny øvelse til dit øvelsesbibliotek
                    </span>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col items-center justify-start border-2 p-0 h-auto overflow-hidden hover:bg-gray-50"
                  onClick={() => haandterDialogValg('find')}
                >
                  <div className="w-full bg-gray-50 p-4 border-b">
                    <Search className="h-8 w-8 mx-auto" />
                  </div>
                  <div className="p-4 w-full flex flex-col items-center">
                    <span className="font-semibold text-base mb-2">Find øvelse</span>
                    <span className="text-xs text-muted-foreground text-center">
                      Vælg fra eksisterende øvelser i dit bibliotek
                    </span>
                  </div>
                </Button>
              </div>
            )}
            
            {dialogTilstand === 'opret' && (
              <div className="py-1">
                <OevelseFormPopup 
                  traeningId={traeningId}
                  onSuccess={async (oevelseId, oevelseNavn) => {
                    await haandterOpretOevelseSuccess(oevelseId, oevelseNavn);
                  }}
                  onCancel={() => {
                    setDialogTilstand('menu');
                  }}
                />
              </div>
            )}
            
            {dialogTilstand === 'find' && (
              <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Input 
                    placeholder="Søg efter øvelse..." 
                    value={soegeord}
                    onChange={(e) => setSoegeord(e.target.value)}
                  />
                </div>
                
                {udfoerendeHandling ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                    {filteredeOevelser.length === 0 ? (
                      <p className="text-center text-muted-foreground">Ingen øvelser fundet</p>
                    ) : (
                      filteredeOevelser.map((oevelse) => (
                        <Button 
                          key={oevelse.id} 
                          variant="outline" 
                          className="w-full justify-start text-left py-3 px-4 h-auto"
                          onClick={async () => {
                            try {
                              // # Tilføj øvelsen
                              const traeningOevelseId = await tilfoejOevelse(oevelse);
                              
                              // # Hvis "Alle deltager" var valgt og øvelses-ID blev oprettet korrekt
                              if (valgteTilstedevaerende && traeningOevelseId) {
                                console.log(`Tilføjer alle tilstedeværende til øvelse (ID: ${traeningOevelseId})`);
                                await tilfoejAlleTilstedevaerende(traeningOevelseId);
                              }
                            } catch (error) {
                              console.error("Fejl ved tilføjelse af øvelse:", error);
                              toast.error("Der opstod en fejl ved tilføjelse af øvelsen");
                            }
                          }}
                        >
                          <div>
                            <div className="font-medium">{oevelse.navn}</div>
                            {oevelse.kategoriNavn && (
                              <div className="text-sm text-muted-foreground">
                                Kategori: {oevelse.kategoriNavn}
                              </div>
                            )}
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            
            {dialogTilstand === 'vaelg-deltagere' && (
              <div className="py-4 space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Input 
                    placeholder="Søg efter deltager..." 
                    value={soegeord}
                    onChange={(e) => setSoegeord(e.target.value)}
                  />
                </div>
                
                {udfoerendeHandling ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-y-auto max-h-60 space-y-2 border rounded-md p-2">
                      {tilstedevaerende.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Ingen deltagere fundet</p>
                      ) : (
                        tilstedevaerende
                          .filter(d => 
                            soegeord === '' || 
                            d.navn.toLowerCase().includes(soegeord.toLowerCase()) ||
                            (d.nummer?.toString() || '').includes(soegeord)
                          )
                          .map((deltager) => (
                            <div 
                              key={deltager.spillerId} 
                              className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded"
                            >
                              <Checkbox 
                                id={`deltager-${deltager.spillerId}`} 
                                checked={valgteIndividuelleDeltagere.includes(deltager.spillerId)}
                                onCheckedChange={(checked) => 
                                  haandterDeltagerValg(deltager.spillerId, checked === true)
                                }
                              />
                              <Label 
                                htmlFor={`deltager-${deltager.spillerId}`}
                                className="flex-1 cursor-pointer flex items-center gap-2"
                              >
                                <span className="font-medium">{deltager.navn}</span>
                                {deltager.nummer && (
                                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">#{deltager.nummer}</span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">{deltager.holdNavn}</span>
                              </Label>
                            </div>
                          ))
                      )}
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setDialogTilstand('menu')}
                      >
                        Annuller
                      </Button>
                      
                      <Button 
                        onClick={fortsaetTilOevelsesvalg}
                        disabled={valgteIndividuelleDeltagere.length === 0}
                      >
                        Fortsæt ({valgteIndividuelleDeltagere.length} valgt)
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {dialogTilstand !== 'menu' && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogTilstand('menu')}>
                  Tilbage
                </Button>
                <Button variant="ghost" onClick={() => setVisOevelsesDialog(false)}>
                  Annuller
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {indlaeser ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Indlæser øvelser...</p>
        </div>
      ) : traeningOevelser.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Der er ikke tilføjet nogen øvelser til denne træning endnu.
            </p>
            <p className="mb-4">
              Klik på "Tilføj øvelse" for at komme i gang.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* # Vis alle øvelser i moduler */}
          {traeningOevelser.map((traeningOevelse, index) => (
            <div 
              key={traeningOevelse.id} 
              className="transition-all duration-300 ease-in-out"
              style={{ 
                marginBottom: udvidetOevelseId === traeningOevelse.id ? "2rem" : "",
              }}
            >
              <Card 
                className={`relative ${udvidetOevelseId === traeningOevelse.id ? 'border-primary' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{traeningOevelse.oevelse.navn}</CardTitle>
                      {traeningOevelse.oevelse.kategoriNavn && (
                        <CardDescription>
                          Kategori: {traeningOevelse.oevelse.kategoriNavn}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <OevelseDeltagereForm 
                        traeningId={traeningId}
                        traeningOevelseId={traeningOevelse.id}
                        tilstedevaerende={tilstedevaerende}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={udfoerendeHandling}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Handlinger</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => flytOevelseOp(index)}
                            disabled={index === 0 || udfoerendeHandling}
                          >
                            <ChevronUp className="mr-2 h-4 w-4" />
                            Flyt op
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => flytOevelseNed(index)}
                            disabled={index === traeningOevelser.length - 1 || udfoerendeHandling}
                          >
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Flyt ned
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => fjernOevelse(traeningOevelse.id)}
                            className="text-destructive"
                            disabled={udfoerendeHandling}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Fjern øvelse
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{traeningOevelse.oevelse.beskrivelse || "Ingen beskrivelse"}</p>
                </CardContent>
                
                {/* Udvidelses-knap i bunden af kortets midten */}
                <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 z-10">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 w-8 p-0 border-primary"
                    onClick={() => toggleOevelseUdvidelse(traeningOevelse.id)}
                  >
                    {udvidetOevelseId === traeningOevelse.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-70 rounded-l"></div>
              </Card>
              
              {/* Udvidet visning for redigering */}
              {udvidetOevelseId === traeningOevelse.id && (
                <Card className="mt-4 border-t-0 rounded-t-none border-primary">
                  <CardContent className="pt-6">
                    <OevelseRedigerForm 
                      traeningOevelse={traeningOevelse}
                      kategorier={alleKategorier}
                      fokuspunkter={alleFokuspunkter}
                      aktuelleOevelseFokuspunkter={aktuelleOevelseFokuspunkter}
                      indlaeserFokuspunkter={indlaeserFokuspunkter}
                      onCancel={() => setUdvidetOevelseId(null)}
                      onSuccess={(opdateretNavn, opdateretKategori, opdateretBeskrivelse, nyeFokuspunkter) => 
                        haandterRedigeringSuccess(opdateretNavn, opdateretKategori, opdateretBeskrivelse, nyeFokuspunkter)
                      }
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
          
          {/* # Afslutningsknap når der er mindst én øvelse */}
          {traeningOevelser.length > 0 && (
            <div className="mt-8 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Træningsopsætning færdig?</h3>
                  <p className="text-sm text-muted-foreground">
                    Når du har tilføjet alle øvelser og er tilfreds med træningen, kan du afslutte opsætningen.
                  </p>
                </div>
                
                <Button 
                  variant="default" 
                  size="lg"
                  onClick={() => {
                    toast.success("Træning gemt og opsætning afsluttet!", {
                      description: "Du kan altid vende tilbage og redigere træningen senere."
                    });
                    
                    // Redirect til træningsoversigten efter kort forsinkelse
                    setTimeout(() => {
                      router.push("/traening");
                    }, 1500);
                  }}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Gem og afslut træning
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 