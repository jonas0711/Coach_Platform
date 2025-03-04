'use client';

import { useState, useEffect } from 'react';
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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, UserCheck, UserPlus, UserX, Search } from "lucide-react";
import { toast } from "sonner";
import { 
  tilfoejDeltagereOevelse, 
  fjernDeltagereOevelse, 
  hentOevelseDeltagere, 
  tilfoejAlleTilstedevaerende, 
  fjernAlleDeltagere 
} from "../actions";

// # Interface for en spiller
interface Spiller {
  spillerId: number;
  navn: string;
  nummer?: number | null;
  erMV: boolean;
  holdId: number;
  holdNavn: string;
}

// # Interface for props til komponenten
interface OevelseDeltagereFormProps {
  traeningId: number;
  traeningOevelseId: number;
  tilstedevaerende: Spiller[];
}

// # Komponent til at vælge deltagere til en øvelse
export function OevelseDeltagereForm({ traeningId, traeningOevelseId, tilstedevaerende }: OevelseDeltagereFormProps) {
  // # State til at styre om dialogen er åben
  const [open, setOpen] = useState(false);
  // # State til at holde styr på valgte deltagere
  const [valgteTilstedevaerende, setValgteTilstedevaerende] = useState<Record<number, boolean>>({});
  // # State til at holde styr på nuværende deltagere i øvelsen
  const [nuvarendeDeltagere, setNuvarendeDeltagere] = useState<Spiller[]>([]);
  // # State til at holde styr på om vi er ved at indlæse data
  const [indlaeser, setIndlaeser] = useState(true);
  // # State til at holde styr på om vi er ved at gemme data
  const [gemmer, setGemmer] = useState(false);
  // # State til at holde styr på søgning
  const [soegeord, setSoegeord] = useState('');
  // # State til at holde styr på aktiv tab
  const [aktivTab, setAktivTab] = useState('alle');

  // # Hent nuværende deltagere når komponenten indlæses eller dialogen åbnes
  useEffect(() => {
    if (open) {
      hentDeltagere();
    }
  }, [open]);

  // # Funktion til at hente nuværende deltagere
  const hentDeltagere = async () => {
    try {
      setIndlaeser(true);
      
      // # Hent deltagere fra databasen
      const deltagere = await hentOevelseDeltagere(traeningOevelseId);
      
      // # Opdater state
      setNuvarendeDeltagere(deltagere);
      
      // # Nulstil valgte deltagere
      const nyeValgte: Record<number, boolean> = {};
      tilstedevaerende.forEach(spiller => {
        // # Marker spillere som ikke-valgte som standard
        nyeValgte[spiller.spillerId] = false;
      });
      
      // # Marker nuværende deltagere som valgte
      deltagere.forEach(deltager => {
        nyeValgte[deltager.spillerId] = true;
      });
      
      setValgteTilstedevaerende(nyeValgte);
      setIndlaeser(false);
    } catch (error) {
      console.error("Fejl ved hentning af deltagere:", error);
      toast.error("Der opstod en fejl ved hentning af deltagere");
      setIndlaeser(false);
    }
  };

  // # Funktion til at gemme ændringer
  const gemAendringer = async () => {
    try {
      setGemmer(true);
      
      // # Find spillere der skal tilføjes (valgte, men ikke allerede deltagere)
      const tilfoejSpillere = tilstedevaerende
        .filter(spiller => valgteTilstedevaerende[spiller.spillerId])
        .filter(spiller => !nuvarendeDeltagere.some(d => d.spillerId === spiller.spillerId))
        .map(spiller => spiller.spillerId);
      
      // # Find spillere der skal fjernes (ikke valgte, men er deltagere)
      const fjernSpillere = nuvarendeDeltagere
        .filter(deltager => !valgteTilstedevaerende[deltager.spillerId])
        .map(deltager => deltager.spillerId);
      
      // # Tilføj nye deltagere
      if (tilfoejSpillere.length > 0) {
        await tilfoejDeltagereOevelse(traeningOevelseId, tilfoejSpillere);
      }
      
      // # Fjern deltagere der ikke længere skal være med
      if (fjernSpillere.length > 0) {
        await fjernDeltagereOevelse(traeningOevelseId, fjernSpillere);
      }
      
      // # Vis bekræftelse
      toast.success("Deltagere opdateret");
      
      // # Luk dialogen
      setOpen(false);
      setGemmer(false);
    } catch (error) {
      console.error("Fejl ved opdatering af deltagere:", error);
      toast.error("Der opstod en fejl ved opdatering af deltagere");
      setGemmer(false);
    }
  };

  // # Funktion til at vælge alle deltagere
  const vaelgAlle = () => {
    const nyeValgte = { ...valgteTilstedevaerende };
    tilstedevaerende.forEach(spiller => {
      nyeValgte[spiller.spillerId] = true;
    });
    setValgteTilstedevaerende(nyeValgte);
  };

  // # Funktion til at fravælge alle deltagere
  const fravaelgAlle = () => {
    const nyeValgte = { ...valgteTilstedevaerende };
    tilstedevaerende.forEach(spiller => {
      nyeValgte[spiller.spillerId] = false;
    });
    setValgteTilstedevaerende(nyeValgte);
  };

  // # Funktion til at tilføje alle tilstedeværende
  const tilfoejAlle = async () => {
    try {
      setGemmer(true);
      
      // # Tilføj alle tilstedeværende til øvelsen
      const resultat = await tilfoejAlleTilstedevaerende(traeningOevelseId, traeningId);
      
      // # Vis bekræftelse
      toast.success(`${resultat.count} deltagere tilføjet til øvelsen`);
      
      // # Hent deltagere igen for at opdatere listen
      await hentDeltagere();
      
      setGemmer(false);
    } catch (error) {
      console.error("Fejl ved tilføjelse af alle tilstedeværende:", error);
      toast.error("Der opstod en fejl ved tilføjelse af alle tilstedeværende");
      setGemmer(false);
    }
  };

  // # Funktion til at fjerne alle deltagere
  const fjernAlle = async () => {
    try {
      setGemmer(true);
      
      // # Fjern alle deltagere fra øvelsen
      const resultat = await fjernAlleDeltagere(traeningOevelseId);
      
      // # Vis bekræftelse
      toast.success(`${resultat.count} deltagere fjernet fra øvelsen`);
      
      // # Hent deltagere igen for at opdatere listen
      await hentDeltagere();
      
      setGemmer(false);
    } catch (error) {
      console.error("Fejl ved fjernelse af alle deltagere:", error);
      toast.error("Der opstod en fejl ved fjernelse af alle deltagere");
      setGemmer(false);
    }
  };

  // # Filtrer spillere baseret på søgning og aktiv tab
  const filtrerSpillere = () => {
    return tilstedevaerende.filter(spiller => {
      // # Filtrer baseret på søgning
      const matcherSoegning = 
        soegeord === '' || 
        spiller.navn.toLowerCase().includes(soegeord.toLowerCase()) ||
        (spiller.nummer?.toString() || '').includes(soegeord) ||
        spiller.holdNavn.toLowerCase().includes(soegeord.toLowerCase());
      
      // # Filtrer baseret på aktiv tab
      const matcherTab = 
        aktivTab === 'alle' || 
        (aktivTab === 'valgte' && valgteTilstedevaerende[spiller.spillerId]) ||
        (aktivTab === 'ikke-valgte' && !valgteTilstedevaerende[spiller.spillerId]);
      
      return matcherSoegning && matcherTab;
    });
  };

  // # Gruppér spillere efter hold
  const grupperSpillere = () => {
    const filtreredeSpillere = filtrerSpillere();
    const grupperet: Record<string, Spiller[]> = {};
    
    filtreredeSpillere.forEach(spiller => {
      if (!grupperet[spiller.holdNavn]) {
        grupperet[spiller.holdNavn] = [];
      }
      grupperet[spiller.holdNavn].push(spiller);
    });
    
    return grupperet;
  };

  // # Beregn antal valgte deltagere
  const antalValgte = Object.values(valgteTilstedevaerende).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>Vælg deltagere</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vælg deltagere til øvelsen</DialogTitle>
          <DialogDescription>
            Vælg hvilke spillere der skal deltage i denne øvelse.
          </DialogDescription>
        </DialogHeader>
        
        {indlaeser ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Søg efter spiller..." 
                  value={soegeord}
                  onChange={(e) => setSoegeord(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setSoegeord('')}
                  disabled={soegeord === ''}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {antalValgte} af {tilstedevaerende.length} valgt
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={vaelgAlle}
                    disabled={gemmer}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Vælg alle
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fravaelgAlle}
                    disabled={gemmer}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Fravælg alle
                  </Button>
                </div>
              </div>
              
              <Tabs defaultValue="alle" value={aktivTab} onValueChange={setAktivTab}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="alle">Alle</TabsTrigger>
                  <TabsTrigger value="valgte">Valgte</TabsTrigger>
                  <TabsTrigger value="ikke-valgte">Ikke valgte</TabsTrigger>
                </TabsList>
                
                <TabsContent value="alle" className="mt-2">
                  <ScrollArea className="h-64">
                    {Object.entries(grupperSpillere()).map(([holdNavn, spillere]) => (
                      <div key={holdNavn} className="mb-4">
                        <h4 className="font-medium mb-2">{holdNavn}</h4>
                        <div className="space-y-2">
                          {spillere.map((spiller) => (
                            <div key={spiller.spillerId} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`spiller-${spiller.spillerId}`}
                                checked={valgteTilstedevaerende[spiller.spillerId] || false}
                                onCheckedChange={(checked) => {
                                  setValgteTilstedevaerende({
                                    ...valgteTilstedevaerende,
                                    [spiller.spillerId]: !!checked,
                                  });
                                }}
                                disabled={gemmer}
                              />
                              <Label 
                                htmlFor={`spiller-${spiller.spillerId}`}
                                className="flex-1 cursor-pointer"
                              >
                                {spiller.navn} {spiller.nummer ? `(${spiller.nummer})` : ''} {spiller.erMV ? '(MV)' : ''}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {Object.keys(grupperSpillere()).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Ingen spillere matcher søgningen
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="valgte" className="mt-2">
                  <ScrollArea className="h-64">
                    {Object.entries(grupperSpillere()).map(([holdNavn, spillere]) => (
                      <div key={holdNavn} className="mb-4">
                        <h4 className="font-medium mb-2">{holdNavn}</h4>
                        <div className="space-y-2">
                          {spillere.map((spiller) => (
                            <div key={spiller.spillerId} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`valgt-${spiller.spillerId}`}
                                checked={valgteTilstedevaerende[spiller.spillerId] || false}
                                onCheckedChange={(checked) => {
                                  setValgteTilstedevaerende({
                                    ...valgteTilstedevaerende,
                                    [spiller.spillerId]: !!checked,
                                  });
                                }}
                                disabled={gemmer}
                              />
                              <Label 
                                htmlFor={`valgt-${spiller.spillerId}`}
                                className="flex-1 cursor-pointer"
                              >
                                {spiller.navn} {spiller.nummer ? `(${spiller.nummer})` : ''} {spiller.erMV ? '(MV)' : ''}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {Object.keys(grupperSpillere()).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Ingen valgte spillere matcher søgningen
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="ikke-valgte" className="mt-2">
                  <ScrollArea className="h-64">
                    {Object.entries(grupperSpillere()).map(([holdNavn, spillere]) => (
                      <div key={holdNavn} className="mb-4">
                        <h4 className="font-medium mb-2">{holdNavn}</h4>
                        <div className="space-y-2">
                          {spillere.map((spiller) => (
                            <div key={spiller.spillerId} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`ikke-valgt-${spiller.spillerId}`}
                                checked={valgteTilstedevaerende[spiller.spillerId] || false}
                                onCheckedChange={(checked) => {
                                  setValgteTilstedevaerende({
                                    ...valgteTilstedevaerende,
                                    [spiller.spillerId]: !!checked,
                                  });
                                }}
                                disabled={gemmer}
                              />
                              <Label 
                                htmlFor={`ikke-valgt-${spiller.spillerId}`}
                                className="flex-1 cursor-pointer"
                              >
                                {spiller.navn} {spiller.nummer ? `(${spiller.nummer})` : ''} {spiller.erMV ? '(MV)' : ''}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {Object.keys(grupperSpillere()).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Ingen ikke-valgte spillere matcher søgningen
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={tilfoejAlle}
                    disabled={gemmer}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Tilføj alle tilstedeværende
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fjernAlle}
                    disabled={gemmer}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Fjern alle
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={gemmer}
              >
                Annuller
              </Button>
              
              <Button 
                onClick={gemAendringer}
                disabled={gemmer}
              >
                {gemmer ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gemmer...
                  </>
                ) : (
                  'Gem ændringer'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
} 