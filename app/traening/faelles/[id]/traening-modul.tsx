'use client';

import { useState, useEffect } from 'react';
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
  hentTraeningOevelseFokuspunkter
} from "./actions";
import { hentAlleOevelser, hentAlleKategorier, hentAlleFokuspunkter, hentOevelseFokuspunkter } from "@/lib/db/actions";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OevelseFormPopup } from './_components/oevelse-form-popup';
import { OevelseRedigerForm } from './_components/oevelse-rediger-form';

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
  // # State til at holde styr på om vi viser "Opret" eller "Find" øvelse
  const [dialogTilstand, setDialogTilstand] = useState<'menu' | 'opret' | 'find'>('menu');
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
  
  // # Hent træningsøvelser ved komponentoprettelse
  useEffect(() => {
    async function hentData() {
      try {
        setIndlaeser(true);
        // # Hent træningsøvelser
        const oevelser = await hentTraeningOevelser(traeningId);
        setTraeningOevelser(oevelser as TraeningOevelse[]);
        
        // # Hent kategorier og fokuspunkter til redigering
        const [kategoriData, fokuspunktData] = await Promise.all([
          hentAlleKategorier(),
          hentAlleFokuspunkter()
        ]);
        
        setAlleKategorier(kategoriData.map(k => k.navn));
        setAlleFokuspunkter(fokuspunktData.map(f => f.tekst));
        
        // # Færdig med at indlæse
        setIndlaeser(false);
      } catch (error) {
        console.error("Fejl ved hentning af træningsøvelser:", error);
        toast.error("Der opstod en fejl ved hentning af træningsøvelser");
        setIndlaeser(false);
      }
    }
    
    hentData();
  }, [traeningId]);
  
  // # Hent alle øvelser når dialogen åbnes
  useEffect(() => {
    async function hentOevelser() {
      if (dialogTilstand === 'find' && alleOevelser.length === 0) {
        try {
          setUdfoerendeHandling(true);
          const oevelser = await hentAlleOevelser();
          setAlleOevelser(oevelser);
          setFilteredeOevelser(oevelser);
          setUdfoerendeHandling(false);
        } catch (error) {
          console.error("Fejl ved hentning af øvelser:", error);
          toast.error("Der opstod en fejl ved hentning af øvelser");
          setUdfoerendeHandling(false);
        }
      }
    }
    
    hentOevelser();
  }, [dialogTilstand, alleOevelser.length]);
  
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
      
      // # Tilføj øvelsen til databasen
      const id = await tilfoejOevelseTilTraening({
        traeningId,
        oevelseId: oevelse.id
      });
      
      // # Opret en ny træningsøvelse
      const nyTraeningOevelse: TraeningOevelse = {
        id,
        traeningId,
        oevelseId: oevelse.id,
        position: traeningOevelser.length + 1,
        oevelse: {
          id: oevelse.id,
          navn: oevelse.navn,
          beskrivelse: oevelse.beskrivelse || null,
          billedeSti: oevelse.billedeSti || null,
          brugerPositioner: oevelse.brugerPositioner,
          minimumDeltagere: oevelse.minimumDeltagere || null,
          kategoriNavn: oevelse.kategoriNavn || null,
        }
      };
      
      // # Tilføj til listen
      setTraeningOevelser([...traeningOevelser, nyTraeningOevelse]);
      
      // # Luk dialogen
      setVisOevelsesDialog(false);
      setDialogTilstand('menu');
      setSoegeord('');
      
      setUdfoerendeHandling(false);
      toast.success(`Øvelse "${oevelse.navn}" tilføjet til træningen`);
    } catch (error) {
      console.error("Fejl ved tilføjelse af øvelse:", error);
      toast.error("Der opstod en fejl ved tilføjelse af øvelse");
      setUdfoerendeHandling(false);
    }
  };
  
  // # Håndter dialog-valg
  const haandterDialogValg = (valg: 'opret' | 'find') => {
    setDialogTilstand(valg);
  };
  
  // # Nulstil dialog når den lukkes
  const nulstilDialog = () => {
    setDialogTilstand('menu');
    setSoegeord('');
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
        
        <Dialog open={visOevelsesDialog} onOpenChange={(open) => {
          setVisOevelsesDialog(open);
          if (!open) nulstilDialog();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setVisOevelsesDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tilføj øvelse
            </Button>
          </DialogTrigger>
          
          <DialogContent 
            className={dialogTilstand === 'opret' ? "sm:max-w-4xl" : "sm:max-w-md"}
            style={dialogTilstand === 'opret' ? { maxHeight: '90vh', height: 'auto' } : {}}
          >
            <DialogHeader>
              <DialogTitle>
                {dialogTilstand === 'menu' ? 'Tilføj øvelse til træning' : 
                 dialogTilstand === 'opret' ? 'Opret ny øvelse' : 'Find øvelse'}
              </DialogTitle>
              <DialogDescription>
                {dialogTilstand === 'menu' ? 'Vælg om du vil oprette en ny øvelse eller finde en eksisterende' : 
                 dialogTilstand === 'opret' ? 'Udfyld formularen for at oprette en ny øvelse' : 'Søg efter en eksisterende øvelse'}
              </DialogDescription>
            </DialogHeader>
            
            {dialogTilstand === 'menu' && (
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button 
                  variant="outline" 
                  className="h-32 flex flex-col items-center justify-center gap-2"
                  onClick={() => haandterDialogValg('opret')}
                >
                  <Plus className="h-8 w-8" />
                  <span>Opret øvelse</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-32 flex flex-col items-center justify-center gap-2"
                  onClick={() => haandterDialogValg('find')}
                >
                  <Search className="h-8 w-8" />
                  <span>Find øvelse</span>
                </Button>
              </div>
            )}
            
            {dialogTilstand === 'opret' && (
              <div className="py-1">
                <OevelseFormPopup 
                  traeningId={traeningId}
                  onSuccess={(oevelseId, oevelseNavn) => {
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
                    
                    // # Genindlæs øvelser for at få korrekte data
                    hentTraeningOevelser(traeningId).then(oevelser => {
                      setTraeningOevelser(oevelser as TraeningOevelse[]);
                    });
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
                  <ScrollArea className="h-72">
                    {filteredeOevelser.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        {alleOevelser.length === 0 
                          ? "Ingen øvelser fundet. Opret en ny øvelse først." 
                          : "Ingen øvelser matcher søgningen."}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredeOevelser.map((oevelse) => (
                          <Card key={oevelse.id} className="cursor-pointer hover:bg-accent" onClick={() => tilfoejOevelse(oevelse)}>
                            <CardHeader className="p-3">
                              <CardTitle className="text-base">{oevelse.navn}</CardTitle>
                              {oevelse.kategoriNavn && (
                                <CardDescription className="text-xs">
                                  Kategori: {oevelse.kategoriNavn}
                                </CardDescription>
                              )}
                            </CardHeader>
                            {oevelse.beskrivelse && (
                              <CardContent className="p-3 pt-0">
                                <p className="text-xs line-clamp-2">{oevelse.beskrivelse}</p>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
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