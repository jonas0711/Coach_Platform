"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PencilIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { opdaterSpiller, hentSpiller } from "@/lib/db/actions";
import { OFFENSIVE_POSITIONER, DEFENSIVE_POSITIONER } from "@/lib/db/schema";
import { useRouter } from "next/navigation";

// # Props til komponenten
interface RedigerSpillerDialogProps {
  spillerId: number;
  buttonText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

// # Interface til formular state
interface FormState {
  navn: string;
  nummer: string;
  erMV: boolean;
  offensivePositioner: {
    position: string;
    erPrimaer: boolean;
  }[];
  defensivePositioner: {
    position: string;
    erPrimaer: boolean;
  }[];
}

export default function RedigerSpillerDialog({
  spillerId,
  buttonText = "Rediger spiller",
  variant = "outline",
}: RedigerSpillerDialogProps) {
  // # State for dialogboksen
  const [open, setOpen] = useState(false);
  // # State for formdata
  const [form, setForm] = useState<FormState>({
    navn: "",
    nummer: "",
    erMV: false,
    offensivePositioner: [],
    defensivePositioner: [],
  });
  // # State for om data er indlæst
  const [isLoaded, setIsLoaded] = useState(false);
  // # State for fejlmeddelelse
  const [error, setError] = useState<string | null>(null);
  // # State for loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til navigation
  const router = useRouter();

  // # Indlæs spillerdata når dialogen åbnes
  useEffect(() => {
    if (open && !isLoaded) {
      loadSpillerData();
    }
  }, [open]);

  // # Hent spillerdata fra serveren
  async function loadSpillerData() {
    try {
      const spiller = await hentSpiller(spillerId);
      
      if (!spiller) {
        setError("Kunne ikke finde spilleren");
        return;
      }
      
      // # Konverter til formatet som formularen bruger
      setForm({
        navn: spiller.navn,
        nummer: spiller.nummer?.toString() || "",
        erMV: spiller.erMV,
        offensivePositioner: spiller.offensivePositioner.map((pos: any) => ({
          position: pos.position,
          erPrimaer: pos.erPrimaer === 1 || pos.erPrimaer === true,
        })),
        defensivePositioner: spiller.defensivePositioner.map((pos: any) => ({
          position: pos.position,
          erPrimaer: pos.erPrimaer === 1 || pos.erPrimaer === true,
        })),
      });
      
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Der opstod en fejl");
    }
  }

  // # Reset formularen når dialogen lukkes
  function handleDialogChange(open: boolean) {
    setOpen(open);
    if (!open) {
      setIsLoaded(false);
      setError(null);
    }
  }

  // # Opdater navn i formularen
  function updateNavn(navn: string) {
    setForm((prev) => ({ ...prev, navn }));
  }

  // # Opdater nummer i formularen
  function updateNummer(nummer: string) {
    // # Tillad kun tal og tom streng
    if (nummer === "" || /^\d+$/.test(nummer)) {
      setForm((prev) => ({ ...prev, nummer }));
    }
  }

  // # Opdater målvogter status
  function updateErMV(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      erMV: checked,
      // # Nulstil positioner hvis spilleren bliver målvogter
      ...(checked
        ? { offensivePositioner: [], defensivePositioner: [] }
        : {}),
    }));
  }

  // # Håndter ændring af offensiv position
  function handleOffensivePositionToggle(position: string, checked: boolean) {
    setForm((prev) => {
      if (checked) {
        // # Tilføj position hvis den ikke findes
        if (!prev.offensivePositioner.some((p) => p.position === position)) {
          return {
            ...prev,
            offensivePositioner: [
              ...prev.offensivePositioner,
              { position, erPrimaer: false },
            ],
          };
        }
      } else {
        // # Fjern position hvis den findes
        return {
          ...prev,
          offensivePositioner: prev.offensivePositioner.filter(
            (p) => p.position !== position
          ),
        };
      }
      return prev;
    });
  }

  // # Håndter ændring af defensiv position
  function handleDefensivePositionToggle(position: string, checked: boolean) {
    setForm((prev) => {
      if (checked) {
        // # Tilføj position hvis den ikke findes
        if (!prev.defensivePositioner.some((p) => p.position === position)) {
          return {
            ...prev,
            defensivePositioner: [
              ...prev.defensivePositioner,
              { position, erPrimaer: false },
            ],
          };
        }
      } else {
        // # Fjern position hvis den findes
        return {
          ...prev,
          defensivePositioner: prev.defensivePositioner.filter(
            (p) => p.position !== position
          ),
        };
      }
      return prev;
    });
  }

  // # Håndter ændring af primær offensiv position
  function handlePrimaryOffensiveToggle(position: string) {
    setForm((prev) => ({
      ...prev,
      offensivePositioner: prev.offensivePositioner.map((pos) => ({
        ...pos,
        erPrimaer: pos.position === position,
      })),
    }));
  }

  // # Håndter ændring af primær defensiv position
  function handlePrimaryDefensiveToggle(position: string, checked: boolean) {
    setForm((prev) => {
      // # Tæl antallet af nuværende primære positioner
      const currentPrimaryCount = prev.defensivePositioner.filter(
        (p) => p.erPrimaer
      ).length;

      // # Hvis vi prøver at fjerne primærstatus, men kun har én primær position, tillad ikke det
      if (!checked && currentPrimaryCount <= 1) {
        return prev;
      }

      // # Hvis vi prøver at tilføje en primær position, men allerede har to, find den ældste
      if (checked && currentPrimaryCount >= 2) {
        const primaryPositions = prev.defensivePositioner
          .filter((p) => p.erPrimaer)
          .map((p) => p.position);
        const oldestPrimary = primaryPositions[0];

        return {
          ...prev,
          defensivePositioner: prev.defensivePositioner.map((pos) => ({
            ...pos,
            erPrimaer:
              pos.position === position
                ? checked
                : pos.position === oldestPrimary
                ? false
                : pos.erPrimaer,
          })),
        };
      }

      // # Ellers bare opdater positionen
      return {
        ...prev,
        defensivePositioner: prev.defensivePositioner.map((pos) => ({
          ...pos,
          erPrimaer: pos.position === position ? checked : pos.erPrimaer,
        })),
      };
    });
  }

  // # Håndter indsendelse af formen
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // # Validér input
    if (!form.navn || form.navn.trim() === "") {
      setError("Spillernavn må ikke være tomt");
      setIsSubmitting(false);
      return;
    }

    // # Konverter til det format som serveren forventer
    const spillerData = {
      navn: form.navn,
      nummer: form.nummer ? parseInt(form.nummer) : undefined,
      erMV: form.erMV,
      offensivePositioner: form.offensivePositioner,
      defensivePositioner: form.defensivePositioner,
    };

    // # Validér at ikke-målvogtere har mindst én offensiv position
    if (!form.erMV && form.offensivePositioner.length === 0) {
      setError("Spilleren skal have mindst én offensiv position");
      setIsSubmitting(false);
      return;
    }

    // # Validér at ikke-målvogtere har præcis én primær offensiv position
    if (!form.erMV) {
      const primærOffensiv = form.offensivePositioner.filter((p) => p.erPrimaer);
      if (primærOffensiv.length !== 1) {
        setError("Spilleren skal have præcis én primær offensiv position");
        setIsSubmitting(false);
        return;
      }
    }

    // # Validér at ikke-målvogtere har mindst én defensiv position
    if (!form.erMV && form.defensivePositioner.length === 0) {
      setError("Spilleren skal have mindst én defensiv position");
      setIsSubmitting(false);
      return;
    }

    // # Validér at ikke-målvogtere har 1-2 primære defensive positioner
    if (!form.erMV) {
      const primærDefensiv = form.defensivePositioner.filter((p) => p.erPrimaer);
      if (primærDefensiv.length < 1 || primærDefensiv.length > 2) {
        setError("Spilleren skal have 1-2 primære defensive positioner");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // # Opdater spiller
      await opdaterSpiller(spillerId, spillerData);
      // # Luk dialog når opdatering er fuldført
      setOpen(false);
      // # Refresh siden for at vise ændringerne
      router.refresh();
    } catch (err) {
      // # Vis fejlmeddelelse hvis opdatering fejler
      setError(err instanceof Error ? err.message : "Der opstod en fejl");
    } finally {
      setIsSubmitting(false);
    }
  }

  // # Hjælpefunktion til at tjekke om en position er valgt
  function hasOffensivePosition(position: string) {
    return form.offensivePositioner.some((p) => p.position === position);
  }

  // # Hjælpefunktion til at tjekke om en position er primær
  function isOffensivePrimary(position: string) {
    return form.offensivePositioner.find((p) => p.position === position)?.erPrimaer || false;
  }

  // # Hjælpefunktion til at tjekke om en defensiv position er valgt
  function hasDefensivePosition(position: string) {
    return form.defensivePositioner.some((p) => p.position === position);
  }

  // # Hjælpefunktion til at tjekke om en defensiv position er primær
  function isDefensivePrimary(position: string) {
    return form.defensivePositioner.find((p) => p.position === position)?.erPrimaer || false;
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <PencilIcon className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rediger spiller</DialogTitle>
          <DialogDescription>
            Redigér spillerens oplysninger nedenfor.
          </DialogDescription>
        </DialogHeader>

        {isLoaded ? (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spiller-navn">Navn</Label>
                <Input
                  id="spiller-navn"
                  placeholder="Indtast navn"
                  value={form.navn}
                  onChange={(e) => updateNavn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spiller-nummer">Nummer</Label>
                <Input
                  id="spiller-nummer"
                  placeholder="Indtast nummer"
                  value={form.nummer}
                  onChange={(e) => updateNummer(e.target.value)}
                />
              </div>
            </div>

            <div className="items-top flex space-x-2">
              <Checkbox
                id="spiller-mv"
                checked={form.erMV}
                onCheckedChange={updateErMV}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="spiller-mv"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Målvogter
                </Label>
                <p className="text-sm text-muted-foreground">
                  Målvogtere har ikke specifikke positioner.
                </p>
              </div>
            </div>

            {!form.erMV && (
              <Tabs defaultValue="offensive" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="offensive">Offensive positioner</TabsTrigger>
                  <TabsTrigger value="defensive">Defensive positioner</TabsTrigger>
                </TabsList>

                <TabsContent value="offensive" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {OFFENSIVE_POSITIONER.map((position) => (
                      <div key={position} className="space-y-2 border p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`off-pos-${position}`}
                              checked={hasOffensivePosition(position)}
                              onCheckedChange={(checked) =>
                                handleOffensivePositionToggle(position, !!checked)
                              }
                            />
                            <Label
                              htmlFor={`off-pos-${position}`}
                              className="font-medium"
                            >
                              {position}
                            </Label>
                          </div>
                        </div>

                        {hasOffensivePosition(position) && (
                          <div className="pl-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`off-prim-${position}`}
                                checked={isOffensivePrimary(position)}
                                onCheckedChange={() =>
                                  handlePrimaryOffensiveToggle(position)
                                }
                              />
                              <Label
                                htmlFor={`off-prim-${position}`}
                                className="text-sm"
                              >
                                Primær
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="defensive" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {DEFENSIVE_POSITIONER.map((position) => (
                      <div key={position} className="space-y-2 border p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`def-pos-${position}`}
                              checked={hasDefensivePosition(position)}
                              onCheckedChange={(checked) =>
                                handleDefensivePositionToggle(position, !!checked)
                              }
                            />
                            <Label
                              htmlFor={`def-pos-${position}`}
                              className="font-medium"
                            >
                              {position}
                            </Label>
                          </div>
                        </div>

                        {hasDefensivePosition(position) && (
                          <div className="pl-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`def-prim-${position}`}
                                checked={isDefensivePrimary(position)}
                                onCheckedChange={(checked) =>
                                  handlePrimaryDefensiveToggle(
                                    position,
                                    !!checked
                                  )
                                }
                              />
                              <Label
                                htmlFor={`def-prim-${position}`}
                                className="text-sm"
                              >
                                Primær
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* # Vis fejlmeddelelse hvis der er en */}
            {error && (
              <div className="text-sm font-medium text-destructive">{error}</div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Annuller
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Gemmer..." : "Gem ændringer"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-8 text-center">
            <p>Indlæser spiller data...</p>
            {error && (
              <div className="text-sm font-medium text-destructive mt-2">{error}</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 