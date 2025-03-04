'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Loader2 } from "lucide-react";

// # Interface til deltagervælgeren
interface DeltagerValgModalProps {
  aaben: boolean;
  onClose: () => void;
  onVaelgTilstedevaerende: () => void;
  onVaelgIndividuelle: () => void;
  ladning: boolean;
}

// # Komponent til at vælge mellem "Alle deltager" eller "Vælg deltagere"
export const DeltagerValgModal = ({
  aaben,
  onClose,
  onVaelgTilstedevaerende,
  onVaelgIndividuelle,
  ladning,
}: DeltagerValgModalProps) => {
  return (
    <Dialog open={aaben} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-[550px] p-0 overflow-hidden" 
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Vælg deltagere</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 p-6">
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-start border-2 p-0 h-auto overflow-hidden hover:bg-gray-50"
            onClick={onVaelgTilstedevaerende}
            disabled={ladning}
          >
            <div className="w-full bg-gray-50 p-4 border-b">
              <Users className="h-8 w-8 mx-auto" />
            </div>
            <div className="p-4 w-full flex flex-col items-center">
              <span className="font-semibold text-base mb-2">Alle tilstedeværende</span>
              <span className="text-xs text-muted-foreground text-center">
                Tilføj alle deltagere som er registreret på træningen
              </span>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-start border-2 p-0 h-auto overflow-hidden hover:bg-gray-50"
            onClick={onVaelgIndividuelle}
            disabled={ladning}
          >
            <div className="w-full bg-gray-50 p-4 border-b">
              <UserPlus className="h-8 w-8 mx-auto" />
            </div>
            <div className="p-4 w-full flex flex-col items-center">
              <span className="font-semibold text-base mb-2">Vælg deltagere</span>
              <span className="text-xs text-muted-foreground text-center">
                Vælg specifikke spillere til denne øvelse
              </span>
            </div>
          </Button>
        </div>

        {ladning && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 