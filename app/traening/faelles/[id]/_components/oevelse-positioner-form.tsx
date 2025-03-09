'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Shield, Swords, Info, AlertCircle, X, Plus, ArrowLeftCircle, ArrowRightCircle, Settings, Save, Copy
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  // # Tilføj detaljeret logging af variationer
  console.log("=== OEVELSE POSITIONER FORM DEBUGGER ===");
  console.log(`Træning ID: ${traeningId}, TræningØvelse ID: ${traeningOevelseId}, Øvelse ID: ${oevelseId}`);
  console.log(`Modtagne variationer (antal: ${variationer?.length || 0}):`, JSON.stringify(variationer, null, 2));
  
  // # Tjek om variationerne er tomme eller undefined
  if (!variationer || variationer.length === 0) {
    console.log("ADVARSEL: Ingen variationer modtaget!");
  } else {
    console.log(`Variation 0 ID: ${variationer[0]?.id}, Navn: ${variationer[0]?.navn}`);
  }
  console.log("============================================");
  
  // # State for dialog
  const [open, setOpen] = useState(false);
  
  // # Flag for initialization
  const dialogOpenRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // # State for loading og data
  const [loading, setLoading] = useState(false);
  const [positionskrav, setPositionskrav] = useState<Position[]>([]);
  const [spillerPositioner, setSpillerPositioner] = useState<SpillerPosition[]>([]);
  const [deltagere, setDeltagere] = useState<Spiller[]>([]);
  const [foreslaaedeSpillere, setForeslaaedeSpillere] = useState<any[]>([]);
  
  // # State for variationer
  const [aktivVariation, setAktivVariation] = useState<number | null>(null);
  const [apiVariationer, setApiVariationer] = useState<Variation[]>([]);
  
  // # Beregn de faktiske variationer der skal bruges (enten fra props eller API)
  const faktiskeVariationer = useMemo(() => {
    return variationer?.length > 0 ? variationer : apiVariationer;
  }, [variationer, apiVariationer]);
  
  // # State for venteliste og gemning
  const [gemmer, setGemmer] = useState(false);
  const [soegeTekst, setSoegeTekst] = useState('');
  const [harUgemteAendringer, setHarUgemteAendringer] = useState(false);
  const [ventendeAendringer, setVentendeAendringer] = useState<PendingChange[]>([]);

  // # State for tekstkopiering-dialog
  const [kopierDialogOpen, setKopierDialogOpen] = useState(false);
  const [kopierTekst, setKopierTekst] = useState('');
  const [oevelsesBeskrivelse, setOevelsesBeskrivelse] = useState<string | null>(null);
  const [oevelsesFokuspunkter, setOevelsesFokuspunkter] = useState<string[]>([]);

  // # Hjælpefunktioner til localStorage
  const getStorageKey = useCallback(() => {
    return `oevelse_variation_${oevelseId}`;
  }, [oevelseId]);

  const gemVariationIStorage = useCallback((variationId: number | null) => {
    try {
      const key = getStorageKey();
      const value = variationId === null ? "null" : variationId.toString();
      
      console.log(`STORAGE: Gemmer variation i localStorage. Nøgle="${key}", værdi="${value}"`);
      localStorage.setItem(key, value);
      
      // Ekstra debug - læs det med det samme for at bekræfte
      const gemt = localStorage.getItem(key);
      console.log(`STORAGE: Bekræftet gemt værdi="${gemt}"`);
    } catch (e) {
      console.error("STORAGE ERROR: Kunne ikke gemme variation:", e);
    }
  }, [getStorageKey]);

  const hentVariationFraStorage = useCallback((): number | null => {
    try {
      const key = getStorageKey();
      const value = localStorage.getItem(key);
      
      console.log(`STORAGE: Læser variation fra localStorage. Nøgle="${key}", værdi="${value}"`);
      
      if (value === null || value === "undefined" || value === "") {
        console.log(`STORAGE: Ingen værdi fundet i localStorage`);
        return null;
      }
      
      if (value === "null") {
        console.log(`STORAGE: Fandt "null" værdi (Venstre side) i localStorage`);
        return null;
      }
      
      const numeriskVaerdi = parseInt(value, 10);
      if (isNaN(numeriskVaerdi)) {
        console.log(`STORAGE: Ugyldig numerisk værdi "${value}" i localStorage`);
        return null;
      }
      
      console.log(`STORAGE: Fandt variation=${numeriskVaerdi} i localStorage`);
      return numeriskVaerdi;
    } catch (e) {
      console.error("STORAGE ERROR: Kunne ikke læse variation:", e);
      return null;
    }
  }, [getStorageKey]);
  
  // # Simpel funktion til at indlæse data baseret på den valgte variation
  const indlaesData = async (variation: number | null) => {
    try {
      setLoading(true);
      console.log(`Indlæser data for ${variation ? 'højre side (variation)' : 'venstre side (hovedpositioner)'}`);
      
      const [positionerKrav, positioner, deltagerliste] = await Promise.all([
        hentOevelsePositionskrav(oevelseId, variation || undefined),
        hentOevelseSpillerPositioner(traeningOevelseId, variation || undefined),
        hentOevelseDeltagere(traeningOevelseId)
      ]);
      
      console.log(`Indlæst ${positionerKrav.length} positionskrav og ${positioner.length} spillerpositioner`);
      
      setPositionskrav(positionerKrav);
      setSpillerPositioner(positioner);
      setDeltagere(deltagerliste);
      
      const foreslaaede = await hentForeslaaedeSpillereV2(
        deltagerliste, 
        traeningOevelseId, 
        variation || undefined
      );
      setForeslaaedeSpillere(foreslaaede);
      
    } catch (error) {
      console.error("Fejl ved indlæsning af data:", error);
      toast.error("Der opstod en fejl ved indlæsning af data");
    } finally {
      setLoading(false);
    }
  };

  // # Funktion til at gemme ændringer
  const gemAendringer = async () => {
    if (ventendeAendringer.length === 0) {
      return;
    }
    
    setGemmer(true);
    
    try {
      // # Sorter ændringer efter tidsstempel for at sikre korrekt rækkefølge
      const sorteredeAendringer = [...ventendeAendringer].sort((a, b) => a.timestamp - b.timestamp);
      
      // # Del ændringer op i tilføjelser og fjernelser
      const tilfoejelser = sorteredeAendringer.filter(a => a.type === 'add');
      const fjernelser = sorteredeAendringer.filter(a => a.type === 'remove');
      
      // # Håndter fjernelser først
      for (const aendring of fjernelser) {
        await fjernPositionFraSpiller(
          traeningOevelseId, 
          aendring.spillerId,
          aendring.position,
          aktivVariation || undefined
        );
      }
      
      // # Håndter tilføjelser bagefter
      for (const aendring of tilfoejelser) {
        await tildelPositionTilSpiller(
          traeningOevelseId, 
          aendring.spillerId, 
          aendring.position, 
          aendring.erOffensiv || false,
          aktivVariation || undefined
        );
      }
      
      // # Ryd ventende ændringer
      setVentendeAendringer([]);
      setHarUgemteAendringer(false);
      
      // # Genindlæs data
      await indlaesData(aktivVariation);
      
      // # Gem den senest aktiverede variation i localStorage
      gemVariationIStorage(aktivVariation);
      
      toast.success('Ændringer gemt');
    } catch (error) {
      console.error("Fejl ved gemning af ændringer:", error);
      toast.error('Der opstod en fejl ved gemning');
    } finally {
      setGemmer(false);
    }
  };
  
  // # Håndter dialog åbning/lukning
  useEffect(() => {
    const handleDialogOpen = async () => {
      console.log("===== DIALOG ÅBNET =====");
      
      if (isInitializedRef.current) {
        console.log("Dialog allerede initialiseret - genindlæser data...");
        indlaesData(aktivVariation);
        return;
      }

      // Marker som under initialisering
      isInitializedRef.current = true;
      setLoading(true);
      
      try {
        // 1. Hent variationer hvis nødvendigt
        if (variationer.length === 0 && apiVariationer.length === 0) {
          console.log("Henter variationer fra API");
          try {
            const response = await fetch(`/api/oevelser/${oevelseId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.variationer?.length) {
                console.log(`Fandt ${data.variationer.length} variationer fra API`);
                setApiVariationer(data.variationer);
              }
            }
          } catch (e) {
            console.error("Kunne ikke hente variationer", e);
          }
        }
        
        // Definer lokale variationer (vi kan ikke stole på state her)
        const lokalVariationer = variationer.length > 0 ? variationer : apiVariationer;
        console.log(`Bruger ${lokalVariationer.length} variationer`);
        
        // 2. Prøv at hente gemt variation fra localStorage
        let gemtVariation = hentVariationFraStorage();
        
        // Hvis vi fandt en gemt variation, bekræft at den eksisterer
        if (gemtVariation !== null) {
          const variationEksisterer = lokalVariationer.some(v => v.id === gemtVariation);
          if (!variationEksisterer) {
            console.log(`ADVARSEL: Den gemte variation ${gemtVariation} findes ikke blandt tilgængelige variationer`);
            gemtVariation = null;
          } else {
            console.log(`SUCCES: Bekræftede at variation ${gemtVariation} eksisterer og kan bruges`);
          }
        }
        
        // 3. Hvis vi har en gyldig gemt variation, brug den straks
        if (gemtVariation !== null) {
          console.log(`BESLUTNING: Bruger gemt variation: ${gemtVariation}`);
          setAktivVariation(gemtVariation);
          await indlaesData(gemtVariation);
          setLoading(false);
          return;
        }
        
        // 4. Ellers tjek begge sider for positioner
        console.log("Ingen gyldig gemt variation - tjekker for positioner på begge sider");
        
        // Tjek højre side for positioner (variationer)
        let hoejreSideVariation: number | null = null;
        
        for (const variation of lokalVariationer) {
          if (!variation || !variation.id) continue;
          
          console.log(`Tjekker variationer for ${variation.navn} (${variation.id})`);
          const positioner = await hentOevelseSpillerPositioner(traeningOevelseId, variation.id);
          
          if (positioner && positioner.length > 0) {
            console.log(`Fundet ${positioner.length} positioner på højre side (${variation.navn})`);
            hoejreSideVariation = variation.id;
            break;
          }
        }
        
        // Tjek venstre side for positioner (hovedpositioner)
        const venstreSidePositioner = await hentOevelseSpillerPositioner(traeningOevelseId, undefined);
        
        // Sæt aktiv variation baseret på fund
        const nyAktivVariation = hoejreSideVariation !== null ? hoejreSideVariation : null;
        console.log(`BESLUTNING: Vælger ${nyAktivVariation ? 'højre' : 'venstre'} side som aktiv variation.`);
        setAktivVariation(nyAktivVariation);
        
        // 5. Indlæs data
        await indlaesData(nyAktivVariation);
        
        // Gem den valgte variation til næste gang (EFTER data er indlæst)
        gemVariationIStorage(nyAktivVariation);
        
        console.log("===== DIALOG INITIALISERING FULDFØRT =====");
      } catch (e) {
        console.error("Fejl under dialog initialisering:", e);
        // Indlæs venstre side ved fejl
        setAktivVariation(null);
        await indlaesData(null);
      } finally {
        setLoading(false);
      }
    };
    
    // Kun kør initialisering når dialogen åbnes
    if (open && dialogOpenRef.current !== open) {
      dialogOpenRef.current = open;
      handleDialogOpen();
    } else if (!open && dialogOpenRef.current !== open) {
      // Nulstil state når dialogen lukkes
      dialogOpenRef.current = open;
      isInitializedRef.current = false; // Tillad reinit ved næste åbning
      setVentendeAendringer([]);
      setHarUgemteAendringer(false);
    }
  }, [open, oevelseId, traeningOevelseId, variationer, aktivVariation, apiVariationer, hentVariationFraStorage, gemVariationIStorage]);

  // # Manuel variation ændring (når brugeren vælger variation)
  const skiftAktivVariation = async (variationId: string) => {
    console.log(`Skifter variation til: ${variationId}`);
    
    if (harUgemteAendringer) {
      toast.promise(
        new Promise<void>(async (resolve, reject) => {
          try {
            if (confirm("Du har ugemte ændringer. Vil du gemme dem før du skifter side?")) {
              await gemAendringer();
              const newVariation = variationId === "null" ? null : parseInt(variationId);
              setAktivVariation(newVariation);
              await indlaesData(newVariation);
              resolve();
            } else if (confirm("Vil du fortsætte og miste dine ændringer?")) {
              const newVariation = variationId === "null" ? null : parseInt(variationId);
              setAktivVariation(newVariation);
              setVentendeAendringer([]);
              setHarUgemteAendringer(false);
              await indlaesData(newVariation);
              
              // Gem den valgte variation
              gemVariationIStorage(newVariation);
              
              resolve();
            } else {
              reject(new Error("Skift annulleret"));
            }
          } catch (error) {
            reject(error);
          }
        }),
        {
          loading: 'Skifter side...',
          success: variationId === "null" 
            ? 'Skiftet til venstre side' 
            : `Skiftet til ${faktiskeVariationer.find(v => v.id.toString() === variationId)?.navn || 'variant'}`,
          error: 'Skift annulleret'
        }
      );
    } else {
      const newVariation = variationId === "null" ? null : parseInt(variationId);
      setAktivVariation(newVariation);
      await indlaesData(newVariation);
      
      // Gem den valgte variation
      gemVariationIStorage(newVariation);
      
      const sidenavn = variationId === "null" 
        ? "venstre side" 
        : faktiskeVariationer.find(v => v.id.toString() === variationId)?.navn?.toLowerCase() || 'variant';
        
      toast.success(`Skiftet til ${sidenavn}`);
    }
  };

  // # Funktion til at annullere ændringer
  const annullerAendringer = () => {
    if (!confirm("Er du sikker på, at du vil annullere alle ændringer?")) {
      return;
    }
    
    // # Ryd ventende ændringer eksplicit
    setVentendeAendringer([]);
    setHarUgemteAendringer(false);
    
    indlaesData(aktivVariation); // Genindlæs data fra databasen
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

  // # Funktion til at fjerne alle positioner
  const fjernAllePositioner = () => {
    if (!confirm("Er du sikker på, at du vil fjerne alle positioner?")) {
      return;
    }
    
    // # Fjern først alle eksisterende positioner lokalt
    const fjernAendringer = spillerPositioner.map(sp => ({
      type: 'remove' as const,
      spillerId: sp.spillerId,
      position: sp.position,
      timestamp: Date.now()
    }));
    
    setVentendeAendringer(prev => [...prev, ...fjernAendringer]);
    setSpillerPositioner([]);
    setHarUgemteAendringer(true);
    
    // # Få sidenavn til besked
    const sideNavn = aktivVariation 
      ? faktiskeVariationer.find(v => v.id === aktivVariation)?.navn || 'højre side'
      : 'venstre side';
    
    toast.success(`Alle ${sideNavn} positioner fjernet (ikke gemt)`);
  };

  // # Funktion til at tildele tilfældige positioner
  const tildelTilfaeldigePositioner = () => {
    // # Kontroller om der er deltagere at tildele
    if (deltagere.length === 0) {
      toast.error("Der er ingen deltagere at tildele positioner til");
      return;
    }
    
    // # Få sidenavn til besked
    const sideNavn = aktivVariation 
      ? faktiskeVariationer.find(v => v.id === aktivVariation)?.navn || 'højre side'
      : 'venstre side';
    
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
    toast.success(`Tilfældige ${sideNavn} positioner tildelt (ikke gemt)`);
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

  // # Funktion til at kopiere øvelsesinformation
  const kopierOevelsesinformation = useCallback(async () => {
    try {
      console.log("Forbereder øvelsesinformation til kopiering");
      
      // Hent øvelsesdetaljer hvis vi ikke har dem endnu
      if (!oevelsesBeskrivelse || oevelsesFokuspunkter.length === 0) {
        const response = await fetch(`/api/oevelser/${oevelseId}`);
        if (response.ok) {
          const oevelse = await response.json();
          setOevelsesBeskrivelse(oevelse.beskrivelse || "Ingen beskrivelse");
          
          // Fokuspunkter
          if (oevelse.fokuspunkter && oevelse.fokuspunkter.length > 0) {
            const fokuspunkter = oevelse.fokuspunkter.map((fp: any) => fp.tekst);
            setOevelsesFokuspunkter(fokuspunkter);
          }
        }
      }
      
      // Gruppér spillere efter position (offensiv/defensiv og positionsnavn)
      const forsvarsspillere: { navn: string; position: string; nummer?: number | null }[] = [];
      const angrebsspillere: { navn: string; position: string; nummer?: number | null }[] = [];
      
      spillerPositioner.forEach(spiller => {
        const spillerInfo = {
          navn: spiller.navn,
          position: spiller.position,
          nummer: spiller.nummer
        };
        
        if (spiller.erOffensiv) {
          angrebsspillere.push(spillerInfo);
        } else {
          forsvarsspillere.push(spillerInfo);
        }
      });
      
      // Formater output tekst
      let outputTekst = `(Beskrivelse) ${oevelsesBeskrivelse || "Ingen beskrivelse"}\n\n`;
      
      // Tilføj fokuspunkter hvis der er nogle
      if (oevelsesFokuspunkter.length > 0) {
        outputTekst += "Fokuspunkter:\n";
        oevelsesFokuspunkter.forEach(punkt => {
          outputTekst += `- ${punkt}\n`;
        });
        outputTekst += "\n";
      }
      
      // Tilføj forsvarsspillere
      if (forsvarsspillere.length > 0) {
        outputTekst += "Forsvar: ";
        outputTekst += forsvarsspillere.map(s => `${s.navn}${s.nummer ? ' (#'+s.nummer+')' : ''} (${s.position})`).join(", ");
        outputTekst += "\n";
      }
      
      // Tilføj angrebsspillere
      if (angrebsspillere.length > 0) {
        outputTekst += "Angreb: ";
        outputTekst += angrebsspillere.map(s => `${s.navn}${s.nummer ? ' (#'+s.nummer+')' : ''} (${s.position})`).join(", ");
      }
      
      // Gem teksten til dialog og åbn dialogen
      setKopierTekst(outputTekst);
      setKopierDialogOpen(true);
      
    } catch (error) {
      console.error("Fejl ved generering af øvelsesinformation:", error);
      toast.error("Der opstod en fejl ved generering af øvelsesinformation");
    }
  }, [oevelseId, spillerPositioner, oevelsesBeskrivelse, oevelsesFokuspunkter]);
  
  // # Funktion til at kopiere tekst til udklipsholder
  const kopierTilUdklipsholder = () => {
    navigator.clipboard.writeText(kopierTekst)
      .then(() => {
        toast.success("Øvelsesinformation kopieret til udklipsholder");
        setKopierDialogOpen(false);
      })
      .catch(err => {
        console.error("Kunne ikke kopiere tekst: ", err);
        toast.error("Der opstod en fejl ved kopiering til udklipsholder");
      });
  };

  return (
    <>
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
              {variationer && variationer.length > 0 && (
                <span className="block mt-1 text-sm">
                  {variationer.length === 1 ? (
                    <>Vælg mellem <strong>venstre side</strong> eller <strong>{variationer[0].navn}</strong> positioner ved at bruge dropdown-menuen under "Side:".</>
                  ) : variationer.some(v => v.navn.toLowerCase().includes('venstre') || v.navn.toLowerCase().includes('højre')) ? (
                    <>Denne øvelse har positioner for både <strong>venstre side</strong> og <strong>højre side</strong>. Skift mellem dem ved at klikke på "Side:" dropdown-menuen.</>
                  ) : (
                    <>Denne øvelse har {variationer.length} variationer af positionsopstillinger. Vælg den ønskede variant via "Side:" dropdown-menuen.</>
                  )}
                </span>
              )}
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
                {/* Status/overblik */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className={`p-3 rounded-md flex-grow ${allePositionerOpfyldt() ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
                    <div className="flex items-center">
                      {allePositionerOpfyldt() ? (
                        <>
                          <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                          <span>Alle positioner er udfyldt.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                          <span>
                            Der mangler at blive tildelt positioner. Manglende: {positionerMedMangler.map(p => p.position).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Forbedret side-vælger med dropdown */}
                  <div className="bg-primary/10 p-1 rounded-md border border-primary/20 flex items-center gap-2">
                    <span className="font-medium pl-2">Side:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2 min-w-36 justify-between">
                          {aktivVariation !== null ? (
                            <>
                              <div className="flex items-center gap-2">
                                {faktiskeVariationer.find(v => v.id === aktivVariation)?.navn.toLowerCase().includes('højre') ? (
                                  <ArrowRightCircle className="h-4 w-4 text-primary" />
                                ) : (
                                  <ArrowLeftCircle className="h-4 w-4 text-primary" />
                                )}
                                <span>{faktiskeVariationer.find(v => v.id === aktivVariation)?.navn || 'Variant'}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <ArrowLeftCircle className="h-4 w-4 text-primary" />
                                <span>Venstre Side</span>
                              </div>
                            </>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem 
                          onClick={() => skiftAktivVariation("null")}
                          className={`flex gap-2 ${aktivVariation === null ? 'bg-accent' : ''}`}
                        >
                          <ArrowLeftCircle className="h-4 w-4" />
                          <span>Venstre Side</span>
                        </DropdownMenuItem>
                        
                        {faktiskeVariationer && faktiskeVariationer.length > 0 ? (
                          faktiskeVariationer.map((variation) => (
                            <DropdownMenuItem 
                              key={`variation_menu_${variation.id}`}
                              onClick={() => skiftAktivVariation(variation.id.toString())}
                              className={`flex gap-2 ${aktivVariation === variation.id ? 'bg-accent' : ''}`}
                            >
                              {variation.navn.toLowerCase().includes('højre') ? (
                                <ArrowRightCircle className="h-4 w-4" />
                              ) : (
                                <Settings className="h-4 w-4" />
                              )}
                              <span>{variation.navn}</span>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            <Info className="h-4 w-4 mr-2" />
                            <span>Ingen variationer fundet</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <div className="flex flex-wrap gap-2 justify-end mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={tildelTilfaeldigePositioner}
                        disabled={gemmer}
                        className="flex items-center"
                      >
                        <Shuffle className="mr-2 h-4 w-4" />
                        {aktivVariation !== null ? (
                          <>
                            Tilfældige positioner
                            <Badge variant="secondary" className="ml-2">
                              {faktiskeVariationer.find(v => v.id === aktivVariation)?.navn || 'variant'}
                            </Badge>
                          </>
                        ) : (
                          <>
                            Tilfældige positioner
                            <Badge variant="secondary" className="ml-2">Venstre Side</Badge>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fjernAllePositioner}
                        disabled={gemmer}
                        className="flex items-center"
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Fjern alle
                        {aktivVariation !== null ? (
                          <Badge variant="secondary" className="ml-2">
                            {faktiskeVariationer.find(v => v.id === aktivVariation)?.navn || 'variant'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">Venstre Side</Badge>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={ventendeAendringer.length === 0 || gemmer}
                        onClick={gemAendringer}
                        className="flex items-center"
                      >
                        {gemmer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Gem ændringer
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
          
          <DialogFooter className="flex flex-row justify-between items-center mt-4">
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={kopierOevelsesinformation}
                className="flex items-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Kopier Øvelsesinformation
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={lukDialog}
                disabled={gemmer}
                className="ml-auto"
              >
                Annuller
              </Button>
              <Button
                type="button"
                onClick={gemAendringer}
                disabled={gemmer || ventendeAendringer.length === 0}
                className="flex items-center"
              >
                {gemmer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Gem ændringer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Kopierings dialog */}
      <AlertDialog open={kopierDialogOpen} onOpenChange={setKopierDialogOpen}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Kopier øvelsesinformation</AlertDialogTitle>
            <AlertDialogDescription>
              Her er den formaterede øvelsesinformation, klar til at kopieres og indsættes i dit øvelsesprogram.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4 p-4 border rounded-md bg-muted/30 whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
            {kopierTekst}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Luk</AlertDialogCancel>
            <AlertDialogAction onClick={kopierTilUdklipsholder} className="flex items-center">
              <Copy className="h-4 w-4 mr-2" />
              Kopier til udklipsholder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 