"use client";

import React, { useState } from "react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2Icon } from "lucide-react";
import { sletTraening } from "@/lib/db/actions";
import { toast } from "sonner";

// # Komponent til at slette en træning
export function SletTraeningDialog({ 
  traeningId, 
  traeningNavn 
}: { 
  traeningId: number; 
  traeningNavn: string;
}) {
  // # State til at styre om dialogen er åben eller lukket
  const [open, setOpen] = useState(false);
  // # State til at håndtere indlæsningstilstand
  const [isDeleting, setIsDeleting] = useState(false);

  // # Funktion til at håndtere sletning
  async function handleDelete() {
    // # Sæt indlæsningstilstand til true
    setIsDeleting(true);
    
    try {
      // # Forsøg at slette træningen fra databasen
      console.log(`Sletter træning med ID: ${traeningId}`);
      await sletTraening(traeningId);
      
      // # Vis en succesmeddelelse
      toast.success("Træningen blev slettet");
      
      // # Luk dialogen
      setOpen(false);
    } catch (error) {
      // # Håndtér fejl og vis en fejlmeddelelse
      console.error("Fejl ved sletning af træning:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      // # Afslut indlæsningstilstand
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {/* # Knap til at åbne dialogen */}
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      
      {/* # Dialog-indhold */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Er du sikker på at du vil slette denne træning?</AlertDialogTitle>
          <AlertDialogDescription>
            Du er ved at slette træningen <strong>"{traeningNavn}"</strong>. 
            Denne handling kan ikke fortrydes, og alle data for denne træning 
            vil blive permanent slettet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuller</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              // # Forhindrer AlertDialog i at lukke automatisk
              e.preventDefault();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sletter...
              </>
            ) : (
              "Slet træning"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 