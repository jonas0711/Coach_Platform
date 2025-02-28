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
import { useState } from "react";
import { opretHold } from "@/lib/db/actions";
import { useRouter } from "next/navigation";

// # Props til dialog-komponenten
interface OpretHoldDialogProps {
  buttonText?: string;
  variant?: "default" | "outline";
}

export default function OpretHoldDialog({ 
  buttonText = "Opret nyt hold",
  variant = "default"
}: OpretHoldDialogProps) {
  // # State til at håndtere dialog åben/lukket
  const [open, setOpen] = useState(false);
  
  // # State til at håndtere holdnavn
  const [navn, setNavn] = useState("");
  
  // # State til at håndtere validering og loading
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // # Router til navigation efter oprettelse
  const router = useRouter();

  // # Håndterer oprettelse af hold
  const handleSubmit = async (e: React.FormEvent) => {
    // # Undgå standard formular-opførsel
    e.preventDefault();
    
    // # Nulstil fejl
    setError("");
    
    // # Validér at navnet ikke er tomt
    if (!navn || navn.trim() === "") {
      setError("Holdnavn må ikke være tomt");
      return;
    }
    
    try {
      // # Angiv at vi er ved at indsende
      setIsSubmitting(true);
      
      // # Kald server-action for at oprette hold
      console.log("Opretter hold med navn:", navn);
      const holdId = await opretHold(navn);
      
      // # Luk dialog og nulstil formular
      setOpen(false);
      setNavn("");
      
      // # Naviger til det nye holds side
      router.push(`/hold/${holdId}`);
      
      // # Opdater UI
      router.refresh();
    } catch (error) {
      // # Hvis der opstår en fejl, vis den
      console.error("Fejl ved oprettelse af hold:", error);
      setError(error instanceof Error ? error.message : "Der opstod en fejl ved oprettelse af holdet");
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Opret nyt hold</DialogTitle>
            <DialogDescription>
              Indtast navn på det nye hold. Du kan tilføje spillere bagefter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="holdnavn">Holdnavn</Label>
              <Input
                id="holdnavn"
                value={navn}
                onChange={(e) => setNavn(e.target.value)}
                placeholder="F.eks. U15 Drenge"
                className={error ? "border-red-500" : ""}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
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
              {isSubmitting ? "Opretter..." : "Opret hold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 