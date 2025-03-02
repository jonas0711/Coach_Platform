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
import { sletSpiller } from "@/lib/db/actions";
import { useRouter } from "next/navigation";

// # Props til komponenten
interface SletSpillerDialogProps {
  spillerId: number;
  spillerNavn: string;
  buttonText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export default function SletSpillerDialog({
  spillerId,
  spillerNavn,
  buttonText = "Slet spiller",
  variant = "destructive",
}: SletSpillerDialogProps) {
  // # State for dialogboksen
  const [open, setOpen] = useState(false);
  // # State for fejlmeddelelse
  const [error, setError] = useState<string | null>(null);
  // # State for loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til navigation
  const router = useRouter();

  // # Håndter sletning af spiller
  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);

    try {
      // # Slet spilleren
      await sletSpiller(spillerId);
      // # Luk dialog når sletning er fuldført
      setOpen(false);
      // # Refresh siden for at vise ændringerne
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
          <DialogTitle>Slet spiller</DialogTitle>
          <DialogDescription>
            Er du sikker på, at du vil slette spilleren "{spillerNavn}"? Denne handling kan ikke fortrydes.
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
            {isSubmitting ? "Sletter..." : "Ja, slet spiller"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 