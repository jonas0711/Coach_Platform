"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon, UserIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// # Type til prop modtaget fra serveren
type TilstedeProps = {
  spillere: {
    id: number;
    navn: string;
    nummer: number | null;
    erMV: boolean;
  }[];
  // # Implementer når vi har database schema
  // tilstede: {
  //   spillerId: number;
  // }[];
};

// # Komponent til at registrere tilstedeværelse ved en træning
export function TilstedeRegistrering({ spillere }: TilstedeProps) {
  // # State til at holde styr på hvem der er til stede
  const [tilstedeSpillere, setTilstedeSpillere] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  
  // # Toggle en spillers tilstedeværelse
  const toggleTilstede = (spillerId: number) => {
    setTilstedeSpillere(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spillerId)) {
        newSet.delete(spillerId);
      } else {
        newSet.add(spillerId);
      }
      return newSet;
    });
  };
  
  // # Gem ændringerne (ikke implementeret endnu)
  const saveChanges = async () => {
    try {
      setIsSaving(true);
      
      // TODO: Implementer datalagring til backend når database-skemaet er klar
      console.log("Gemmer tilstedeværelse:", Array.from(tilstedeSpillere));
      
      // # Simuler en API-kald forsinkelse
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Tilstedeværelse er gemt");
      router.refresh();
    } catch (error) {
      console.error("Fejl ved gemning af tilstedeværelse:", error);
      toast.error("Der opstod en fejl ved gemning af tilstedeværelse");
    } finally {
      setIsSaving(false);
    }
  };
  
  // # Beregn antal spillere markeret som tilstede
  const antalTilstede = tilstedeSpillere.size;
  const antalSpillere = spillere.length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tilstedeværelse</span>
          <span className="text-sm font-normal">
            {antalTilstede} af {antalSpillere} tilstede
          </span>
        </CardTitle>
        <CardDescription>
          Marker hvilke spillere der var til stede ved denne træning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* # Liste over spillere */}
          <div className="space-y-4">
            {spillere.map((spiller) => (
              <div 
                key={spiller.id} 
                className={`flex items-center justify-between p-2 rounded-md border ${
                  tilstedeSpillere.has(spiller.id) 
                    ? "bg-primary/10 border-primary" 
                    : "bg-muted/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={spiller.erMV ? "bg-blue-500" : ""}>
                      {spiller.nummer || <UserIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{spiller.navn}</span>
                    {spiller.erMV && (
                      <span className="text-xs text-muted-foreground">Målvogter</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tilstedeSpillere.has(spiller.id) && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                  <Switch
                    checked={tilstedeSpillere.has(spiller.id)}
                    onCheckedChange={() => toggleTilstede(spiller.id)}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* # Gem knap */}
          <div className="flex justify-end">
            <Button onClick={saveChanges} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Gemmer...
                </>
              ) : (
                "Gem tilstedeværelse"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 