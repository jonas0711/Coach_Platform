"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { opretSpiller } from "@/lib/db/actions";
import { useRouter } from "next/navigation";
import { OFFENSIVE_POSITIONER, OffensivPosition, DEFENSIVE_POSITIONER, DefensivPosition } from "@/lib/db/schema";

// # Props til dialog-komponenten
interface OpretSpillerDialogProps {
  holdId: number;
  buttonText?: string;
  variant?: "default" | "outline";
}

// # Interface til positioner for bedre typesikkerhed
interface Position<T> {
  position: T;
  erPrimaer: boolean;
  erValgt: boolean;
}

export default function OpretSpillerDialog({ 
  holdId,
  buttonText = "Tilføj spiller",
  variant = "default"
}: OpretSpillerDialogProps) {
  // # State til at håndtere dialog åben/lukket
  const [open, setOpen] = useState(false);
  
  // # State til at håndtere spiller-data
  const [navn, setNavn] = useState("");
  const [nummer, setNummer] = useState<string>("");
  const [erMV, setErMV] = useState(false);
  const [offensivRating, setOffensivRating] = useState<string>("");
  const [defensivRating, setDefensivRating] = useState<string>("");
  
  // # State til positioner - nu med erValgt flag
  const [offensivePositioner, setOffensivePositioner] = useState<Position<OffensivPosition>[]>([]);
  const [defensivePositioner, setDefensivePositioner] = useState<Position<DefensivPosition>[]>([]);
  
  // # State til at håndtere validering og loading
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // # Router til navigation efter oprettelse
  const router = useRouter();
  
  // # Initialiser positionerne når dialogen åbnes
  useEffect(() => {
    if (open) {
      // # Nulstil formularen når dialogen åbnes
      setNavn("");
      setNummer("");
      setErMV(false);
      setOffensivRating("");
      setDefensivRating("");
      
      // # Initialiser offensive positioner
      setOffensivePositioner(
        OFFENSIVE_POSITIONER.map((position) => ({
          position: position as OffensivPosition,
          erPrimaer: false,
          erValgt: false
        }))
      );
      
      // # Initialiser defensive positioner
      setDefensivePositioner(
        DEFENSIVE_POSITIONER.map((position) => ({
          position: position as DefensivPosition,
          erPrimaer: false,
          erValgt: false
        }))
      );
    }
  }, [open]);
  
  // # Opdatér primær offensiv position
  const opdaterPrimaerOffensiv = (position: OffensivPosition) => {
    setOffensivePositioner((current) =>
      current.map((pos) => ({
        ...pos,
        erPrimaer: pos.position === position,
        // # Sæt som valgt hvis den er primær
        erValgt: pos.position === position ? true : pos.erValgt
      }))
    );
  };
  
  // # Toggle sekundær offensiv position
  const toggleOffensivPosition = (position: OffensivPosition) => {
    setOffensivePositioner((current) => {
      // # Find den aktuelle position
      const currentPos = current.find((p) => p.position === position);
      
      if (!currentPos) return current;
      
      // # Hvis positionen er primær, fjern primær status og valgt status
      if (currentPos.erPrimaer) {
        return current.map((pos) => ({
          ...pos,
          erPrimaer: false,
          erValgt: pos.position === position ? false : pos.erValgt
        }));
      }
      
      // # Ellers toggle valgt status
      return current.map((pos) => {
        if (pos.position === position) {
          return {
            ...pos,
            erValgt: !pos.erValgt
          };
        }
        return pos;
      });
    });
  };
  
  // # Toggle primær defensiv position (max 2)
  const toggleDefensivPrimaer = (position: DefensivPosition) => {
    setDefensivePositioner((current) => {
      // # Find den aktuelle position
      const currentPos = current.find((p) => p.position === position);
      
      if (!currentPos) return current;
      
      // # Tæl antallet af primære positioner
      const antalPrimaere = current.filter((p) => p.erPrimaer).length;
      
      // # Hvis positionen allerede er primær, så fjern primær status
      if (currentPos.erPrimaer) {
        return current.map((pos) => ({
          ...pos,
          erPrimaer: pos.position !== position && pos.erPrimaer,
          // # Behold position som valgt
          erValgt: pos.position === position ? true : pos.erValgt
        }));
      }
      
      // # Hvis vi allerede har to primære positioner, så kan vi ikke tilføje flere
      if (antalPrimaere >= 2 && !currentPos.erPrimaer) {
        return current;
      }
      
      // # Ellers opdater status for den valgte position
      return current.map((pos) => ({
        ...pos,
        erPrimaer: pos.position === position ? true : pos.erPrimaer,
        // # Sæt som valgt hvis den er primær
        erValgt: pos.position === position ? true : pos.erValgt
      }));
    });
  };
  
  // # Toggle sekundær defensiv position
  const toggleDefensivPosition = (position: DefensivPosition) => {
    setDefensivePositioner((current) => {
      // # Find den aktuelle position
      const currentPos = current.find((p) => p.position === position);
      
      if (!currentPos) return current;
      
      // # Hvis positionen er primær, lad den være primær og fortsæt
      if (currentPos.erPrimaer) {
        return current;
      }
      
      // # Ellers toggle valgt status
      return current.map((pos) => {
        if (pos.position === position) {
          return {
            ...pos,
            erValgt: !pos.erValgt
          };
        }
        return pos;
      });
    });
  };
  
  // # Håndterer oprettelse af spiller
  const handleSubmit = async (e: React.FormEvent) => {
    // # Undgå standard formular-opførsel
    e.preventDefault();
    
    // # Nulstil fejl
    setError("");
    
    // # Validér at navnet ikke er tomt
    if (!navn || navn.trim() === "") {
      setError("Spillernavn må ikke være tomt");
      return;
    }
    
    // # Hvis ikke målvogter, validér positioner og ratings
    if (!erMV) {
      // # Tjek for primær offensiv position
      const primærOffensiv = offensivePositioner.filter(p => p.erPrimaer);
      if (primærOffensiv.length !== 1) {
        setError("Vælg præcis én primær offensiv position");
        return;
      }
      
      // # Tjek for 1-2 primære defensive positioner
      const primærDefensiv = defensivePositioner.filter(p => p.erPrimaer);
      if (primærDefensiv.length < 1 || primærDefensiv.length > 2) {
        setError("Vælg én til to primære defensive positioner");
        return;
      }

      // # Validér ratings hvis de er angivet
      if (offensivRating && (parseInt(offensivRating) < 1 || parseInt(offensivRating) > 10)) {
        setError("Offensiv rating skal være mellem 1 og 10");
        return;
      }
      if (defensivRating && (parseInt(defensivRating) < 1 || parseInt(defensivRating) > 10)) {
        setError("Defensiv rating skal være mellem 1 og 10");
        return;
      }
    }
    
    try {
      // # Angiv at vi er ved at indsende
      setIsSubmitting(true);
      
      // # Forbered spiller-data
      const spillerData = {
        navn,
        nummer: nummer ? parseInt(nummer) : undefined,
        erMV,
        offensivePositioner: erMV ? [] : offensivePositioner
          .filter(p => p.erValgt || p.erPrimaer)
          .map(({ position, erPrimaer }) => ({ position, erPrimaer })),
        defensivePositioner: erMV ? [] : defensivePositioner
          .filter(p => p.erValgt || p.erPrimaer)
          .map(({ position, erPrimaer }) => ({ position, erPrimaer })),
        offensivRating: !erMV && offensivRating ? parseInt(offensivRating) : undefined,
        defensivRating: !erMV && defensivRating ? parseInt(defensivRating) : undefined,
      };
      
      // # Kald server-action for at oprette spiller
      console.log("Opretter spiller med data:", spillerData);
      await opretSpiller(holdId, spillerData);
      
      // # Luk dialog og nulstil formular
      setOpen(false);
      
      // # Opdater UI
      router.refresh();
    } catch (error) {
      // # Hvis der opstår en fejl, vis den
      console.error("Fejl ved oprettelse af spiller:", error);
      setError(error instanceof Error ? error.message : "Der opstod en fejl ved oprettelse af spilleren");
    } finally {
      // # Angiv at vi ikke længere indsender
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          {variant === "default" && (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="mr-2"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          )}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tilføj spiller</DialogTitle>
            <DialogDescription>
              Udfyld spillerens oplysninger. Markér hvis spilleren er målvogter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {/* # Basisoplysninger */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="navn">Navn <span className="text-red-500">*</span></Label>
                <Input
                  id="navn"
                  value={navn}
                  onChange={(e) => setNavn(e.target.value)}
                  placeholder="F.eks. Anders Andersen"
                  className={error && !navn ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nummer">Trøjenummer</Label>
                <Input
                  id="nummer"
                  type="number"
                  value={nummer}
                  onChange={(e) => setNummer(e.target.value)}
                  placeholder="F.eks. 7"
                />
                <p className="text-xs text-muted-foreground">Valgfri</p>
              </div>
            </div>
            
            {/* # Målvogter toggle */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="erMV"
                  checked={erMV}
                  onChange={(e) => setErMV(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="erMV">Spilleren er målvogter (MV)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Hvis markeret, behøver du ikke vælge positioner.
              </p>
            </div>
            
            {/* # Positioner (vises kun hvis ikke målvogter) */}
            {!erMV && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* # Offensive positioner */}
                <div className="space-y-2 border p-3 rounded-lg">
                  <div>
                    <Label className="text-base">Offensive positioner</Label>
                    <div className="flex gap-1.5 mb-1 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full font-semibold">
                        Primær
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs bg-muted rounded-full">
                        Sekundær
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vælg én primær position og eventuelt flere sekundære.
                    </p>
                  </div>
                  
                  {/* # Primære offensive positioner */}
                  <div>
                    <p className="text-sm font-medium mb-1">Primær position:</p>
                    <div className="grid grid-cols-3 gap-1">
                      {offensivePositioner.map((pos) => (
                        <button
                          key={`primær-${pos.position}`}
                          type="button"
                          onClick={() => opdaterPrimaerOffensiv(pos.position)}
                          className={`py-2 px-3 rounded-md text-center transition-colors ${
                            pos.erPrimaer
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-muted/60 hover:bg-muted"
                          }`}
                        >
                          {pos.position}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* # Sekundære offensive positioner */}
                  <div>
                    <p className="text-sm font-medium mb-1">Sekundære positioner:</p>
                    <div className="grid grid-cols-3 gap-1">
                      {offensivePositioner.map((pos) => (
                        <button
                          key={`sekundær-${pos.position}`}
                          type="button"
                          onClick={() => toggleOffensivPosition(pos.position)}
                          disabled={pos.erPrimaer}
                          className={`py-2 px-3 rounded-md text-center transition-colors ${
                            pos.erPrimaer
                              ? "bg-primary text-primary-foreground opacity-70 cursor-not-allowed"
                              : pos.erValgt
                              ? "bg-muted font-medium ring-2 ring-muted-foreground/20"
                              : "bg-muted/60 hover:bg-muted"
                          }`}
                        >
                          {pos.position}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Primære positioner kan ikke vælges som sekundære.
                    </p>
                  </div>
                </div>
                
                {/* # Defensive positioner */}
                <div className="space-y-2 border p-3 rounded-lg">
                  <div>
                    <Label className="text-base">Defensive positioner</Label>
                    <div className="flex gap-1.5 mb-1 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full font-semibold">
                        Primær
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs bg-muted rounded-full">
                        Sekundær
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vælg 1-2 primære positioner og eventuelt flere sekundære.
                    </p>
                  </div>
                  
                  {/* # Primære defensive positioner */}
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Primære positioner (maks 2):
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {defensivePositioner.map((pos) => (
                        <button
                          key={`primær-${pos.position}`}
                          type="button"
                          onClick={() => toggleDefensivPrimaer(pos.position)}
                          className={`py-2 px-3 rounded-md text-center transition-colors ${
                            pos.erPrimaer
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "bg-muted/60 hover:bg-muted"
                          }`}
                        >
                          {pos.position}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valgte primære: {defensivePositioner.filter(p => p.erPrimaer).map(p => p.position).join(', ') || "Ingen"}
                    </p>
                  </div>
                  
                  {/* # Sekundære defensive positioner */}
                  <div>
                    <p className="text-sm font-medium mb-1">Sekundære positioner:</p>
                    <div className="grid grid-cols-3 gap-1">
                      {defensivePositioner.map((pos) => (
                        <button
                          key={`sekundær-${pos.position}`}
                          type="button"
                          onClick={() => toggleDefensivPosition(pos.position)}
                          disabled={pos.erPrimaer}
                          className={`py-2 px-3 rounded-md text-center transition-colors ${
                            pos.erPrimaer
                              ? "bg-primary text-primary-foreground opacity-70 cursor-not-allowed"
                              : pos.erValgt
                              ? "bg-muted font-medium ring-2 ring-muted-foreground/20"
                              : "bg-muted/60 hover:bg-muted"
                          }`}
                        >
                          {pos.position}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Primære positioner kan ikke vælges som sekundære.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ratings (kun hvis ikke målvogter) */}
            {!erMV && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="offensivRating" className="text-right">
                    Offensiv Rating
                  </Label>
                  <Input
                    id="offensivRating"
                    type="number"
                    min="1"
                    max="10"
                    value={offensivRating}
                    onChange={(e) => setOffensivRating(e.target.value)}
                    className="col-span-3"
                    placeholder="1-10"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="defensivRating" className="text-right">
                    Defensiv Rating
                  </Label>
                  <Input
                    id="defensivRating"
                    type="number"
                    min="1"
                    max="10"
                    value={defensivRating}
                    onChange={(e) => setDefensivRating(e.target.value)}
                    className="col-span-3"
                    placeholder="1-10"
                  />
                </div>
              </div>
            )}
            
            {/* # Fejlbesked */}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter className="sticky bottom-0 pt-2 pb-2 bg-background border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Annuller
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Gemmer..." : "Gem spiller"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 