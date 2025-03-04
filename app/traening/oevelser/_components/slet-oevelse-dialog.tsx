"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { sletOevelse } from "@/lib/db/actions";
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
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

// Props der kræves for at slette en øvelse
interface SletOevelseDialogProps {
  oevelseId: number;
  oevelseNavn: string;
}

// Komponent der viser en dialog til bekræftelse af øvelsessletning
export function SletOevelseDialog({ oevelseId, oevelseNavn }: SletOevelseDialogProps) {
  // State til at håndtere åbning/lukning af dialogen
  const [open, setOpen] = useState(false);
  // State til at spore indlæsningsprocessen
  const [isLoading, setIsLoading] = useState(false);
  // Hook til at vise toast-beskeder
  const { toast } = useToast();
  // Router til navigation
  const router = useRouter();

  // Håndterer sletning af en øvelse
  async function handleSlet() {
    try {
      // Indikerer at sletningen er i gang
      setIsLoading(true);
      
      // Viser en toast besked om at sletningen er startet
      toast({
        title: "Sletter øvelse...",
        description: "Vent venligst mens øvelsen slettes fra systemet.",
      });
      
      // Kalder API-funktionen til at slette øvelsen
      await sletOevelse(oevelseId);
      
      // Lukker dialogen efter vellykket sletning
      setOpen(false);
      
      // Viser en bekræftelsesbesked
      toast({
        title: "Øvelsen er slettet",
        description: "Øvelsen blev slettet med succes.",
      });

      // Naviger tilbage til øvelsesoversigten
      router.push('/traening/oevelser');
      router.refresh();
    } catch (error) {
      // Håndterer fejl hvis sletningen mislykkes
      console.error("Fejl ved sletning af øvelse:", error);
      toast({
        title: "Kunne ikke slette øvelsen",
        description: "Der opstod en fejl. Prøv igen senere.",
        variant: "destructive",
      });
    } finally {
      // Nulstiller indlæsningstilstanden
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slet øvelse</DialogTitle>
          <DialogDescription>
            Er du sikker på, at du vil slette øvelsen <strong>{oevelseNavn}</strong>? 
            Denne handling kan ikke fortrydes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Annuller
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSlet}
            disabled={isLoading}
          >
            {isLoading ? "Sletter..." : "Slet øvelse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 