"use client";

import { useState } from "react";
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
import { TrashIcon } from "lucide-react";
import { sletHold } from "@/lib/db/actions";
import { useRouter } from "next/navigation";

// # Props til komponenten
interface SletHoldDialogProps {
  holdId: number;
  holdNavn: string;
  buttonText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export default function SletHoldDialog({
  holdId,
  holdNavn,
  buttonText = "Slet hold",
  variant = "destructive",
}: SletHoldDialogProps) {
  // # State for dialogboksen
  const [open, setOpen] = useState(false);
  // # State for fejlmeddelelse
  const [error, setError] = useState<string | null>(null);
  // # State for loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til navigation
  const router = useRouter();

  // # Håndter sletning af hold
  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);

    try {
      // # Slet holdet
      await sletHold(holdId);
      // # Luk dialog når sletning er fuldført
      setOpen(false);
      // # Naviger tilbage til holdlisten
      router.push("/hold");
      router.refresh();
    } catch (err) {
      // # Vis fejlmeddelelse hvis sletning fejler
      setError(err instanceof Error ? err.message : "Der opstod en fejl");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <TrashIcon className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Slet hold</DialogTitle>
          <DialogDescription>
            Er du sikker på, at du vil slette holdet "{holdNavn}"? Denne handling kan ikke fortrydes, og alle spillere på holdet vil også blive slettet.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* # Vis fejlmeddelelse hvis der er en */}
          {error && (
            <div className="text-sm font-medium text-destructive mb-4">{error}</div>
          )}
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
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sletter..." : "Ja, slet hold"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 