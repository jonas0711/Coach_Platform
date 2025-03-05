'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, Users, UserX, Search, Shuffle, 
  Shield, Swords, Info, AlertCircle, X, Plus
} from "lucide-react";
import { toast } from "sonner";
import { 
  hentOevelseDeltagere, 
  tildelPositionTilSpiller, 
  fjernPositionFraSpiller, 
  fjernAllePositionerFraOevelse, 
  hentOevelseSpillerPositioner, 
  hentOevelsePositionskrav,
  hentForeslaaedeSpillereV2
} from '@/lib/db/actions';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type ConnectDragSource, type ConnectDropTarget } from 'react-dnd';

// # Interface for en spiller
interface Spiller {
  spillerId: number;
  navn: string;
  nummer?: number | null;
  erMV: boolean;
  holdId: number;
  holdNavn: string;
}

// # Interface for en position
interface Position {
  position: string;
  antalKraevet: number;
  erOffensiv: boolean;
}

// # Interface for en variation
interface Variation {
  id: number;
  navn: string;
  beskrivelse?: string | null;
}

// # Interface for en spillerposition
interface SpillerPosition {
  spillerId: number;
  position: string;
  erOffensiv: boolean;
  variationId: number | null;
  navn: string;
  nummer?: number | null;
  erMV: boolean;
  holdId: number;
  holdNavn: string;
}

// # Interface for props til komponenten
interface OevelsePositionerFormProps {
  traeningId: number;
  traeningOevelseId: number;
  oevelseId: number;
  tilstedevaerende: Spiller[];
  variationer?: Variation[];
}

// # Type for drag-item
interface DragSpiller {
  type: 'spiller';
  spillerId: number;
  navn: string;
  nummer?: number | null;
  holdNavn: string;
  erMV: boolean;
  currentPosition?: string | null;
}

// # Interface for props til DraggableSpiller-komponenten
interface DraggableSpillerProps {
  spiller: Spiller;
  currentPosition?: string | null;
  onRemove?: (() => void) | null;
  isDraggable?: boolean;
}

// # Interface for props til PositionBox-komponenten
interface PositionBoxProps {
  positionskrav: Position;
  spillerPositioner: SpillerPosition[];
  onTildelPosition: (spillerId: number, position: string, erOffensiv: boolean) => void;
  onFjernPosition: (spillerId: number, position: string) => void;
  onFlytSpiller: (spillerId: number, position: string, erOffensiv: boolean, fraPosition: string) => void;
  gemmer: boolean;
  foreslaaedeSpillere?: any[];
}

// # Type for en ventende ændring til databasen
interface PendingChange {
  type: 'add' | 'remove';
  spillerId: number;
  position: string;
  erOffensiv?: boolean;
  timestamp: number; // Brug tidsstempel for at holde styr på rækkefølgen
}

// # Komponent til at vise en spiller i drag-and-drop kontekst
const DraggableSpiller = ({ 
  spiller, 
  currentPosition = null,
  onRemove = null,
  isDraggable = true
}: DraggableSpillerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'spiller',
    item: { 
      type: 'spiller', 
      spillerId: spiller.spillerId,
      navn: spiller.navn,
      nummer: spiller.nummer,
      holdNavn: spiller.holdNavn,
      erMV: spiller.erMV,
      currentPosition 
    },
    canDrag: isDraggable,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }), [spiller, currentPosition, isDraggable]);
  
  // # Tilknyt drag-funktionalitet til ref
  if (isDraggable) {
    drag(ref);
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex justify-between items-center p-2 border rounded-md bg-card",
        isDragging ? "opacity-50" : "opacity-100",
        !isDraggable && "cursor-not-allowed opacity-70"
      )}
    >
      <div className="flex items-center">
        <span className="font-medium">{spiller.navn}</span>
        {spiller.nummer && (
          <span className="ml-2 text-sm text-muted-foreground">#{spiller.nummer}</span>
        )}
        <span className="ml-2 text-xs text-muted-foreground">{spiller.holdNavn}</span>
      </div>
      {onRemove && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onRemove}
        >
          <UserX className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

// # Komponent til at vise en position i drag-and-drop kontekst
const PositionBox = ({ 
  positionskrav, 
  spillerPositioner, 
  onTildelPosition, 
  onFjernPosition,
  onFlytSpiller,
  gemmer,
  foreslaaedeSpillere = []
}: PositionBoxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { position, antalKraevet, erOffensiv } = positionskrav;
  
  // # Find spillere der er tildelt denne position
  const spillerePaaPosition = spillerPositioner.filter(
    (sp: SpillerPosition) => sp.position === position
  );
  
  // # Beregn antal tildelte og manglende spillere
  const antalSpillere = spillerePaaPosition.length;
  const antalManglende = Math.max(0, antalKraevet - antalSpillere);
  
  // # Filtrer foreslåede spillere for denne position
  const foreslaaedeForPosition = foreslaaedeSpillere.filter(
    fs => fs.position === position && fs.erOffensiv === erOffensiv
  );
  
  // # Filtrer foreslåede spillere, så vi kun viser dem der ikke allerede har en position
  const tilgaengeligeForeslaaedeSpillere = foreslaaedeForPosition.filter(
    fs => !spillerPositioner.some(sp => sp.spillerId === fs.spillerId)
  );
  
  // # Drop-logik for denne positionsboks
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'spiller',
    drop: (item: DragSpiller) => {
      // # Hvis spilleren allerede er i denne position, gør intet
      if (item.currentPosition === position) return;
      
      // # Hvis spilleren kommer fra en anden position, flyt den
      if (item.currentPosition) {
        onFlytSpiller(item.spillerId, position, erOffensiv, item.currentPosition);
      } else {
        // # Ellers tildel positionen direkte
        onTildelPosition(item.spillerId, position, erOffensiv);
      }
    },
    canDrop: (item) => {
      // # Kan kun droppe her hvis spilleren ikke allerede er på denne position
      return item.currentPosition !== position;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [position, erOffensiv, onTildelPosition, onFlytSpiller]);
  
  // # Tilknyt drop-funktionalitet til ref
  drop(ref);

  return (
    <div className="relative"> {/* Wrapper til positionsboks og forslag */}
      {/* Selve positionsboksen */}
      <div 
        ref={ref}
        className={cn(
          "relative border rounded-md p-3 h-full flex flex-col",
          isOver && canDrop ? "border-primary border-2" : "border-border",
          erOffensiv ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-blue-50/50 dark:bg-blue-950/20"
        )}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            {erOffensiv ? (
              <Swords className="h-4 w-4 mr-1 text-amber-600 dark:text-amber-400" />
            ) : (
              <Shield className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
            )}
            <h3 className="font-semibold">{position}</h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={antalManglende > 0 ? "destructive" : "default"}>
                  {antalSpillere}/{antalKraevet}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{antalManglende > 0 
                  ? `Mangler ${antalManglende} spiller(e)` 
                  : "Alle positioner er fyldt"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <ScrollArea className="flex-grow min-h-[100px] max-h-[180px]">
          <div className="space-y-2">
            {/* Tildelte spillere */}
            {spillerePaaPosition.map((sp: SpillerPosition) => (
              <DraggableSpiller
                key={`player_in_pos_${sp.spillerId}_${position}`}
                spiller={sp}
                currentPosition={position}
                onRemove={() => onFjernPosition(sp.spillerId, position)}
                isDraggable={!gemmer}
              />
            ))}

            {/* Foreslåede spillere - vist inde i boksen, men med tydelig visuel adskillelse */}
            {antalManglende > 0 && tilgaengeligeForeslaaedeSpillere.length > 0 && (
              <div className="mt-3 border-t border-dashed pt-2">
                <p className="text-xs text-muted-foreground mb-1.5">Foreslåede spillere:</p>
                <div className="space-y-1.5">
                  {tilgaengeligeForeslaaedeSpillere.map((foreslaaet) => (
                    <div
                      key={`suggested_${foreslaaet.spillerId}_${position}`}
                      className={`
                        relative group
                        border border-dotted rounded-md px-2 py-1.5
                        flex items-center justify-between gap-1
                        opacity-75 hover:opacity-100 transition-opacity
                        ${foreslaaet.erPrimaer 
                          ? (erOffensiv ? "border-amber-300 bg-amber-50/50" : "border-blue-300 bg-blue-50/50")
                          : "border-muted/50 bg-muted/10"
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        {foreslaaet.nummer && (
                          <Badge 
                            variant="outline" 
                            className={`
                              h-5 min-w-5 p-0 flex items-center justify-center text-xs
                              ${erOffensiv ? "border-amber-400 bg-amber-50" : "border-blue-400 bg-blue-50"}
                            `}
                          >
                            {foreslaaet.nummer}
                          </Badge>
                        )}
                        <span>{foreslaaet.navn}</span>
                        {foreslaaet.erPrimaer && (
                          <Badge variant="outline" className="px-1 h-4 text-[10px] bg-primary/5 border-primary/20">
                            Primær
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-background"
                        onClick={() => onTildelPosition(foreslaaet.spillerId, position, erOffensiv)}
                        disabled={gemmer}
                        title={`Tilføj ${foreslaaet.navn} til ${position}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="sr-only">Tilføj {foreslaaet.navn}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Placeholder når der mangler spillere men ingen forslag findes */}
            {antalManglende > 0 && tilgaengeligeForeslaaedeSpillere.length === 0 && (
              <div className="text-center text-muted-foreground text-sm p-2 border border-dashed rounded-md">
                {antalManglende === 1 
                  ? "Træk 1 spiller hertil" 
                  : `Træk ${antalManglende} spillere hertil`}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// # Komponent til at tildele positioner til spillere i en øvelse
export function OevelsePositionerForm({ 
  traeningId, 
  traeningOevelseId, 
  oevelseId, 
  tilstedevaerende,
  variationer = []
}: OevelsePositionerFormProps) {
  // # State for dialog
  const [open, setOpen] = useState(false);
  
  // # State for loading og data
  const [loading, setLoading] = useState(false);
  const [positionskrav, setPositionskrav] = useState<Position[]>([]);
  const [spillerPositioner, setSpillerPositioner] = useState<SpillerPosition[]>([]);
  const [deltagere, setDeltagere] = useState<Spiller[]>([]);
  const [foreslaaedeSpillere, setForeslaaedeSpillere] = useState<any[]>([]);
  
  // # State for variationer
  const [aktivVariation, setAktivVariation] = useState<number | null>(null);
  
  // # State for venteliste og gemning
  const [gemmer, setGemmer] = useState(false);
  const [soegeTekst, setSoegeTekst] = useState('');
  const [harUgemteAendringer, setHarUgemteAendringer] = useState(false);
  const [ventendeAendringer, setVentendeAendringer] = useState<PendingChange[]>([]);

  // # Hent data når komponenten indlæses eller dialogen åbnes
  useEffect(() => {
    if (open) {
      hentData();
    } else {
      // # Ryd ventende ændringer når dialogen lukkes
      setVentendeAendringer([]);
      setHarUgemteAendringer(false);
    }
  }, [open, aktivVariation]);

  // # Funktion til at hente data
  const hentData = async () => {
    // # Sæt loading state
    setLoading(true);
    
    try {
      // # Hent positionskrav, spillerpositioner og deltagere parallelt
      const [positionerKrav, positioner, deltagerliste] = await Promise.all([
        hentOevelsePositionskrav(oevelseId),
        hentOevelseSpillerPositioner(traeningOevelseId, aktivVariation || undefined),
        hentOevelseDeltagere(traeningOevelseId)
      ]);
      
      // # Opdater state med hentet data
      setPositionskrav(positionerKrav);
      setSpillerPositioner(positioner);
      setDeltagere(deltagerliste);
      
      // # Hent foreslåede spillere baseret på deres foretrukne positioner
      const foreslaaede = await hentForeslaaedeSpillereV2(deltagerliste, traeningOevelseId, aktivVariation || undefined);
      setForeslaaedeSpillere(foreslaaede);
      
      // # Efter data er genindlæst fra database, ryd ventende ændringer
      // # Dette sikrer at tilstanden er konsistent med databasen
      if (ventendeAendringer.length > 0) {
        setVentendeAendringer([]);
        setHarUgemteAendringer(false);
      }
    } catch (error) {
      console.error("Fejl ved hentning af data:", error);
      toast.error("Der opstod en fejl ved hentning af data");
    } finally {
      // # Afslut loading state
      setLoading(false);
    }
  };

  // # Funktion til at gemme alle ventende ændringer til databasen
  const gemAendringer = async () => {
    if (ventendeAendringer.length === 0) {
      toast.info("Ingen ændringer at gemme");
      return;
    }
    
    try {
      setGemmer(true);
      
      // # Sorter ændringer efter tidsstempel (ældste først)
      const sorteredeAendringer = [...ventendeAendringer]
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // # Opbyg en optimeret liste af ændringer ved at fjerne modstridende eller overflødige ændringer
      const optimeredeAendringer: Record<string, PendingChange> = {};
      
      for (const aendring of sorteredeAendringer) {
        const noegle = `${aendring.spillerId}-${aendring.position}`;
        
        // # Hvis der er en 'add' efterfulgt af en 'remove' for samme spiller/position, annuller begge
        if (optimeredeAendringer[noegle] && 
            optimeredeAendringer[noegle].type === 'add' && 
            aendring.type === 'remove') {
          delete optimeredeAendringer[noegle];
        }
        // # Ellers opdater med den nyeste ændring
        else {
          optimeredeAendringer[noegle] = aendring;
        }
      }
      
      // # Få den endelige liste af ændringer der skal udføres
      const endeligeAendringer = Object.values(optimeredeAendringer);
      
      // # Udfør alle 'remove' operationer først
      const fjernOperationer = endeligeAendringer.filter(a => a.type === 'remove');
      for (const op of fjernOperationer) {
        await fjernPositionFraSpiller(
          traeningOevelseId,
          op.spillerId,
          op.position,
          aktivVariation || undefined
        );
      }
      
      // # Derefter udfør alle 'add' operationer
      const tilfoejOperationer = endeligeAendringer.filter(a => a.type === 'add');
      for (const op of tilfoejOperationer) {
        if (op.erOffensiv !== undefined) {
          await tildelPositionTilSpiller(
            traeningOevelseId,
            op.spillerId,
            op.position,
            op.erOffensiv,
            aktivVariation || undefined
          );
        }
      }
      
      // # Hent data igen for at sikre konsistens
      await hentData();
      
      // # Ryd ventende ændringer og nulstil ugemte ændringer flag
      setVentendeAendringer([]);
      setHarUgemteAendringer(false);
      
      toast.success("Ændringer gemt");
    } catch (error) {
      console.error("Fejl ved gemning af ændringer:", error);
      toast.error("Der opstod en fejl ved gemning af ændringer");
      
      // # Ved fejl, hent data igen for at sikre UI er konsistent med databasen
      await hentData();
    } finally {
      setGemmer(false);
    }
  };

  // # Funktion til at rydde alle ventende ændringer
  const annullerAendringer = () => {
    if (!confirm("Er du sikker på, at du vil annullere alle ændringer?")) {
      return;
    }
    
    // # Ryd ventende ændringer eksplicit
    setVentendeAendringer([]);
    setHarUgemteAendringer(false);
    
    hentData(); // Genindlæs data fra databasen
    toast.info("Ændringer annulleret");
  };

  // # Funktion til at tildele position til en spiller - kun lokalt
  const tildelPosition = (spillerId: number, position: string, erOffensiv: boolean) => {
    // # Find spilleren
    const spiller = deltagere.find(d => d.spillerId === spillerId);
    if (!spiller) return;
    
    // # Opret ny spillerposition
    const nyPosition: SpillerPosition = {
      spillerId: spiller.spillerId,
      position: position,
      erOffensiv: erOffensiv,
      variationId: aktivVariation,
      navn: spiller.navn,
      nummer: spiller.nummer,
      erMV: spiller.erMV,
      holdId: spiller.holdId,
      holdNavn: spiller.holdNavn
    };
    
    // # Tilføj ventende ændring
    setVentendeAendringer(prev => [
      ...prev,
      {
        type: 'add',
        spillerId,
        position,
        erOffensiv,
        timestamp: Date.now()
      }
    ]);
    
    // # Opdater UI
    setSpillerPositioner(prev => [...prev, nyPosition]);
    setHarUgemteAendringer(true);
  };

  // # Funktion til at fjerne position fra en spiller - kun lokalt
  const fjernPosition = (spillerId: number, position: string) => {
    // # Tilføj ventende ændring
    setVentendeAendringer(prev => [
      ...prev,
      {
        type: 'remove',
        spillerId,
        position,
        timestamp: Date.now()
      }
    ]);
    
    // # Opdater UI
    setSpillerPositioner(prev => 
      prev.filter(sp => !(sp.spillerId === spillerId && sp.position === position))
    );
    
    setHarUgemteAendringer(true);
  };

  // # Funktion til at flytte en spiller fra en position til en anden - kun lokalt
  const flytSpiller = (spillerId: number, nyPosition: string, erOffensiv: boolean, fraPosition: string) => {
    // # Find spilleren
    const spiller = deltagere.find(d => d.spillerId === spillerId) || 
                  spillerPositioner.find(sp => sp.spillerId === spillerId);
    
    if (!spiller) return;
    
    // # Tilføj ventende ændringer - først fjern gammel position, så tilføj ny
    setVentendeAendringer(prev => [
      ...prev,
      {
        type: 'remove',
        spillerId,
        position: fraPosition,
        timestamp: Date.now()
      },
      {
        type: 'add',
        spillerId,
        position: nyPosition,
        erOffensiv,
        timestamp: Date.now() + 1 // +1 for at sikre rækkefølgen
      }
    ]);
    
    // # Opdater UI
    setSpillerPositioner(prev => {
      // # Fjern spilleren fra den gamle position
      const filtreretListe = prev.filter(sp => 
        !(sp.spillerId === spillerId && sp.position === fraPosition)
      );
      
      // # Tilføj til den nye position
      return [
        ...filtreretListe,
        {
          spillerId,
          position: nyPosition,
          erOffensiv,
          variationId: aktivVariation,
          navn: spiller.navn,
          nummer: spiller.nummer,
          erMV: spiller.erMV,
          holdId: spiller.holdId,
          holdNavn: spiller.holdNavn
        }
      ];
    });
    
    setHarUgemteAendringer(true);
  };

  // # Funktion til at fjerne alle positioner - kun lokalt
  const fjernAllePositioner = () => {
    if (!confirm("Er du sikker på, at du vil fjerne alle positioner?")) {
      return;
    }
    
    // # Tilføj ventende ændringer for hver spillerposition
    const nyeAendringer = spillerPositioner.map(sp => ({
      type: 'remove' as const,
      spillerId: sp.spillerId,
      position: sp.position,
      timestamp: Date.now()
    }));
    
    if (nyeAendringer.length > 0) {
      setVentendeAendringer(prev => [...prev, ...nyeAendringer]);
      setSpillerPositioner([]);
      setHarUgemteAendringer(true);
      toast.success("Alle positioner fjernet (ikke gemt)");
    } else {
      toast.info("Ingen positioner at fjerne");
    }
  };

  // # Funktion til at tildele tilfældige positioner - kun lokalt
  const tildelTilfaeldigePositioner = () => {
    if (!confirm("Er du sikker på, at du vil tildele tilfældige positioner?")) {
      return;
    }
    
    // # Fjern først alle eksisterende positioner lokalt
    const fjernAendringer = spillerPositioner.map(sp => ({
      type: 'remove' as const,
      spillerId: sp.spillerId,
      position: sp.position,
      timestamp: Date.now()
    }));
    
    // # Opret en kopi af deltagere, som vi kan tildele positioner fra
    const tilgaengeligeDeltagere = [...deltagere];
    const nyePositioner: SpillerPosition[] = [];
    const tilfoejAendringer: PendingChange[] = [];
    
    // # For hver position i positionskrav
    for (const krav of positionskrav) {
      // # For hver krævet spiller i positionen
      for (let i = 0; i < krav.antalKraevet; i++) {
        // # Hvis der ikke er flere tilgængelige deltagere, stop
        if (tilgaengeligeDeltagere.length === 0) {
          break;
        }
        
        // # Vælg en tilfældig deltager
        const randomIndex = Math.floor(Math.random() * tilgaengeligeDeltagere.length);
        const deltager = tilgaengeligeDeltagere[randomIndex];
        
        // # Tilføj til den nye liste af positioner
        nyePositioner.push({
          spillerId: deltager.spillerId,
          position: krav.position,
          erOffensiv: krav.erOffensiv,
          variationId: aktivVariation,
          navn: deltager.navn,
          nummer: deltager.nummer,
          erMV: deltager.erMV,
          holdId: deltager.holdId,
          holdNavn: deltager.holdNavn
        });
        
        // # Tilføj som ventende ændring
        tilfoejAendringer.push({
          type: 'add',
          spillerId: deltager.spillerId,
          position: krav.position,
          erOffensiv: krav.erOffensiv,
          timestamp: Date.now() + i + 1 // Sikrer rækkefølge med unikke tidsstempler
        });
        
        // # Fjern deltageren fra listen af tilgængelige deltagere
        tilgaengeligeDeltagere.splice(randomIndex, 1);
      }
    }
    
    setVentendeAendringer(prev => [...prev, ...fjernAendringer, ...tilfoejAendringer]);
    setSpillerPositioner(nyePositioner);
    setHarUgemteAendringer(true);
    toast.success("Tilfældige positioner tildelt (ikke gemt)");
  };

  // # Funktion til at skifte aktiv variation
  const skiftAktivVariation = (variationId: string) => {
    // # Hvis der er ugemte ændringer, vis advarsel
    if (harUgemteAendringer && !confirm("Du har ugemte ændringer. Vil du fortsætte og miste disse ændringer?")) {
      return;
    }
    
    setAktivVariation(variationId === "null" ? null : parseInt(variationId));
  };

  // # Filtrer deltagere baseret på søgning
  const filtrerDeltagere = () => {
    return deltagere.filter(deltager => {
      // # Filtrer baseret på søgning
      if (soegeTekst === '') return true;
      
      return deltager.navn.toLowerCase().includes(soegeTekst.toLowerCase()) ||
        (deltager.nummer?.toString() || '').includes(soegeTekst) ||
        deltager.holdNavn.toLowerCase().includes(soegeTekst.toLowerCase());
    });
  };

  // # Gruppér deltagere efter hold
  const grupperDeltagere = () => {
    const filtreredeDeltagere = filtrerDeltagere();
    const grupperet: Record<string, Spiller[]> = {};
    
    filtreredeDeltagere.forEach(deltager => {
      if (!grupperet[deltager.holdNavn]) {
        grupperet[deltager.holdNavn] = [];
      }
      grupperet[deltager.holdNavn].push(deltager);
    });
    
    return grupperet;
  };

  // # Tjek om en spiller er tildelt en position
  const erSpillerTildeltPosition = (spillerId: number) => {
    return spillerPositioner.some(sp => sp.spillerId === spillerId);
  };

  // # Få position for en spiller hvis den er tildelt
  const getSpillerPosition = (spillerId: number) => {
    const position = spillerPositioner.find(sp => sp.spillerId === spillerId);
    return position ? position.position : null;
  };

  // # Gruppér positioner efter offensiv/defensiv
  const grupperPositioner = useMemo(() => {
    const offensive = positionskrav.filter(p => p.erOffensiv);
    const defensive = positionskrav.filter(p => !p.erOffensiv);
    return { offensive, defensive };
  }, [positionskrav]);

  // # Tjek om alle positioner er opfyldt
  const allePositionerOpfyldt = () => {
    return positionskrav.every(krav => {
      const tildelte = spillerPositioner.filter(sp => sp.position === krav.position).length;
      return tildelte >= krav.antalKraevet;
    });
  };

  const positionerMedMangler = positionskrav.filter(krav => {
    const tildelte = spillerPositioner.filter(sp => sp.position === krav.position).length;
    return tildelte < krav.antalKraevet;
  });

  // # Funktion til at lukke dialogen
  const lukDialog = () => {
    // # Hvis der er ugemte ændringer, vis advarsel
    if (harUgemteAendringer && !confirm("Du har ugemte ændringer. Vil du lukke uden at gemme?")) {
      return;
    }
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // # Hvis der er ugemte ændringer og dialogen lukkes, vis advarsel
      if (!isOpen && harUgemteAendringer && !confirm("Du har ugemte ændringer. Vil du lukke uden at gemme?")) {
        return;
      }
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Users className="h-4 w-4 mr-2" />
          Positioner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tildel positioner til spillere</DialogTitle>
          <DialogDescription>
            Træk spillere fra højre side til de relevante positionsbokse.
          </DialogDescription>
          {harUgemteAendringer && (
            <div className="mt-2 text-amber-600 dark:text-amber-400 font-semibold">
              Du har ugemte ændringer. Husk at gemme før du lukker dialogen.
            </div>
          )}
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <div className="space-y-4">
              {/* Variationsvælger */}
              {variationer && variationer.length > 0 && (
                <div>
                  <Label htmlFor="variation">Variation</Label>
                  <Select
                    value={aktivVariation === null ? "null" : aktivVariation.toString()}
                    onValueChange={skiftAktivVariation}
                  >
                    <SelectTrigger id="variation">
                      <SelectValue placeholder="Vælg variation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Hovedpositioner</SelectItem>
                      {variationer.map((variation) => (
                        <SelectItem key={`variation_${variation.id}`} value={variation.id.toString()}>
                          {variation.navn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Status/overblik */}
              <div className={`p-3 rounded-md ${allePositionerOpfyldt() ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                <div className="flex items-center">
                  {allePositionerOpfyldt() ? (
                    <>
                      <Info className="h-5 w-5 mr-2" />
                      <span>Alle positioner er udfyldt.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>
                        Der mangler at blive tildelt positioner. Manglende: {positionerMedMangler.map(p => p.position).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Positionskrav */}
              {positionskrav.length > 0 ? (
                <div className="space-y-6">
                  {/* Grid med positioner */}
                  <div className="space-y-1">
                    {grupperPositioner.offensive.length > 0 && (
                      <>
                        <div className="flex items-center mb-2">
                          <Swords className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                          <h3 className="text-lg font-semibold">Offensive positioner</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                          {grupperPositioner.offensive.map((krav) => (
                            <PositionBox
                              key={`position_${krav.position}`}
                              positionskrav={krav}
                              spillerPositioner={spillerPositioner}
                              onTildelPosition={tildelPosition}
                              onFjernPosition={fjernPosition}
                              onFlytSpiller={flytSpiller}
                              gemmer={gemmer}
                              foreslaaedeSpillere={foreslaaedeSpillere}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {grupperPositioner.defensive.length > 0 && (
                      <>
                        <div className="flex items-center mb-2">
                          <Shield className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-lg font-semibold">Defensive positioner</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {grupperPositioner.defensive.map((krav) => (
                            <PositionBox
                              key={`position_${krav.position}`}
                              positionskrav={krav}
                              spillerPositioner={spillerPositioner}
                              onTildelPosition={tildelPosition}
                              onFjernPosition={fjernPosition}
                              onFlytSpiller={flytSpiller}
                              gemmer={gemmer}
                              foreslaaedeSpillere={foreslaaedeSpillere}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Knapper til at tildele tilfældige positioner eller fjerne alle */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={tildelTilfaeldigePositioner}
                      disabled={gemmer || deltagere.length === 0}
                    >
                      {gemmer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shuffle className="h-4 w-4 mr-2" />}
                      Tilfældige positioner
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={fjernAllePositioner}
                      disabled={gemmer || spillerPositioner.length === 0}
                    >
                      {gemmer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserX className="h-4 w-4 mr-2" />}
                      Fjern alle
                    </Button>
                  </div>
                  
                  {/* Tilgængelige spillere */}
                  <div className="bg-muted/30 p-4 rounded-md">
                    <div className="mb-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-medium">Tilgængelige spillere</Label>
                        <div className="relative w-full max-w-xs">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Søg efter spiller..."
                            className="pl-8"
                            value={soegeTekst}
                            onChange={(e) => setSoegeTekst(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[250px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(grupperDeltagere()).map(([holdNavn, spillere]) => (
                          <div key={`team_${holdNavn}`} className="space-y-3">
                            <h4 className="font-medium text-sm">{holdNavn}</h4>
                            <div className="space-y-2">
                              {spillere
                                .filter(spiller => !erSpillerTildeltPosition(spiller.spillerId))
                                .map((spiller) => (
                                  <DraggableSpiller
                                    key={`player_${spiller.spillerId}`}
                                    spiller={spiller}
                                    isDraggable={!gemmer}
                                  />
                                ))}
                            </div>
                            {spillere.filter(spiller => !erSpillerTildeltPosition(spiller.spillerId)).length === 0 && (
                              <div className="text-sm text-muted-foreground italic">
                                Alle spillere er tildelt positioner
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {filtrerDeltagere().length === 0 && (
                        <div className="flex justify-center items-center h-40 text-muted-foreground">
                          Ingen spillere matcher søgningen
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center py-8 text-muted-foreground">
                  Denne øvelse har ingen definerede positioner
                </div>
              )}
            </div>
          </DndProvider>
        )}
        
        <DialogFooter className="flex justify-between space-x-2">
          <div className="flex space-x-2">
            {harUgemteAendringer && (
              <Button 
                variant="outline" 
                onClick={annullerAendringer}
                disabled={gemmer || !harUgemteAendringer}
              >
                Annuller ændringer
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              onClick={gemAendringer}
              disabled={gemmer || !harUgemteAendringer}
            >
              {gemmer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gem ændringer
            </Button>
            <Button variant="outline" onClick={lukDialog}>Luk</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 