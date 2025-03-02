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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PencilIcon } from "lucide-react";
import { opdaterHold } from "@/lib/db/actions";
import { useRouter } from "next/navigation";

// # Props til komponenten
interface RedigerHoldDialogProps {
  holdId: number;
  holdNavn: string;
  buttonText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export default function RedigerHoldDialog({
  holdId,
  holdNavn,
  buttonText = "Rediger hold",
  variant = "outline",
}: RedigerHoldDialogProps) {
  // # State for dialogboksen
  const [open, setOpen] = useState(false);
  // # State for formdata
  const [navn, setNavn] = useState(holdNavn);
  // # State for fejlmeddelelse
  const [error, setError] = useState<string | null>(null);
  // # State for loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til navigation
  const router = useRouter();

  // # Håndter indsendelse af formen
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // # Validér input
    if (!navn || navn.trim() === "") {
      setError("Holdnavn må ikke være tomt");
      setIsSubmitting(false);
      return;
    }

    try {
      // # Opdater hold
      await opdaterHold(holdId, navn);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <PencilIcon className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rediger hold</DialogTitle>
          <DialogDescription>
            Opdater holdets navn nedenfor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="hold-navn">Holdnavn</Label>
            <Input
              id="hold-navn"
              placeholder="Indtast holdnavn"
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
            />
          </div>

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
      </DialogContent>
    </Dialog>
  );
} 