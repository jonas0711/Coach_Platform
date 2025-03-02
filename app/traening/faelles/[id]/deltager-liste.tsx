"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, UserCheck } from "lucide-react";
import { registrerTilstedevarelse } from "@/lib/db/actions";

// # Interface for spillere
interface Spiller {
  spiller_id: number;
  navn: string;
  nummer?: number;
  holdId: number;
  holdNavn: string;
  erMaalMand: boolean;
}

// # Interface for tilstedeværelse
interface Tilstedevarelse {
  spillerId: number;
  tilstede: boolean;
}

// # Props for komponenten
interface DeltagerListeProps {
  traeningId: number;
  spillere: Spiller[];
  tilstedevarelse: Tilstedevarelse[];
}

// # Komponent til at administrere spillere der deltager i træningen
export function DeltagerListe({
  traeningId,
  spillere,
  tilstedevarelse = [],
}: DeltagerListeProps) {
  // # State for loading status
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # State for søgning
  const [searchQuery, setSearchQuery] = useState("");
  // # Router til at opdatere siden
  const router = useRouter();

  // # Initial tilstedeværelse baseret på tidligere registreringer
  const initialTilstedevarelse: Record<number, boolean> = {};
  
  // # Opdater initialTilstedevarelse med data fra props
  tilstedevarelse.forEach((t) => {
    initialTilstedevarelse[t.spillerId] = t.tilstede;
  });
  
  // # For spillere der ikke har tilstedeværelse endnu, sæt dem til fraværende
  spillere.forEach((spiller) => {
    if (initialTilstedevarelse[spiller.spiller_id] === undefined) {
      initialTilstedevarelse[spiller.spiller_id] = false;
    }
  });
  
  // # State til at holde styr på tilstedeværelse
  const [attendance, setAttendance] = useState<Record<number, boolean>>(initialTilstedevarelse);

  // # Sortér og filtrer spillere baseret på søgning
  const filteredSpillere = useMemo(() => {
    // # Filtrér først spillerne baseret på søgning
    const filtered = spillere.filter((spiller) => {
      if (!searchQuery.trim()) return true;
      
      // # Søg i navn, nummer og holdnavn
      const searchLower = searchQuery.toLowerCase();
      return (
        spiller.navn.toLowerCase().includes(searchLower) ||
        (spiller.nummer?.toString() || "").includes(searchLower) ||
        spiller.holdNavn.toLowerCase().includes(searchLower)
      );
    });
    
    // # Gruppér spillere efter hold
    const grouped: Record<number, Spiller[]> = {};
    filtered.forEach((spiller) => {
      if (!grouped[spiller.holdId]) {
        grouped[spiller.holdId] = [];
      }
      grouped[spiller.holdId].push(spiller);
    });
    
    // # Returner struktureret objekt med holdId og spillere
    return {
      grouped,
      count: filtered.length,
      total: spillere.length,
      tilstede: Object.values(attendance).filter(Boolean).length
    };
  }, [spillere, searchQuery, attendance]);

  // # Håndter ændring af tilstedeværelse
  const handleAttendanceChange = (spillerId: number, checked: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [spillerId]: checked,
    }));
  };

  // # Indsendelse af tilstedeværelse
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // # Konverter attendance object til array af spillere og tilstedeværelse
      const tilstedevaelseData = Object.entries(attendance).map(([spillerId, tilstede]) => ({
        spillerId: parseInt(spillerId),
        tilstede,
      }));
      
      // # Send data til serveren
      await registrerTilstedevarelse(traeningId, tilstedevaelseData);
      
      // # Vis succesmeddelelse
      toast.success("Tilstedeværelse blev gemt");
      
      // # Opdaterer siden
      router.refresh();
    } catch (error) {
      // # Håndter fejl
      console.error("Fejl ved registrering af tilstedeværelse:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deltagerliste</CardTitle>
        <CardDescription>
          Markér spillere der er til stede ved træningen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* # Søgefelt og tilstedeværelsesstatistik */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Søg efter spiller..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex gap-1 items-center">
              <Users className="h-3.5 w-3.5" />
              <span>{filteredSpillere.count} af {filteredSpillere.total} spillere</span>
            </Badge>
            <Badge variant="outline" className="flex gap-1 items-center">
              <UserCheck className="h-3.5 w-3.5" />
              <span>{filteredSpillere.tilstede} tilstede</span>
            </Badge>
          </div>
        </div>
        
        {/* # Spillertabel */}
        {Object.keys(filteredSpillere.grouped).length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Til stede</TableHead>
                  <TableHead>Navn</TableHead>
                  <TableHead className="w-20">Nr.</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Hold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* # Løb gennem hvert hold og vis deres spillere */}
                {Object.keys(filteredSpillere.grouped).map((holdId) => {
                  const holdSpillere = filteredSpillere.grouped[parseInt(holdId)];
                  const holdNavn = holdSpillere[0]?.holdNavn || "Ukendt hold";
                  
                  return (
                    <React.Fragment key={holdId}>
                      {/* # Hold header */}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-medium">
                          {holdNavn} ({holdSpillere.length} spillere)
                        </TableCell>
                      </TableRow>
                      
                      {/* # Spillere på dette hold */}
                      {holdSpillere.map((spiller) => (
                        <TableRow key={spiller.spiller_id}>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={attendance[spiller.spiller_id] || false}
                              onCheckedChange={(checked) => 
                                handleAttendanceChange(spiller.spiller_id, !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell>{spiller.navn}</TableCell>
                          <TableCell>{spiller.nummer || "-"}</TableCell>
                          <TableCell>
                            {spiller.erMaalMand ? (
                              <Badge variant="secondary">Målmand</Badge>
                            ) : (
                              <Badge variant="outline">Markspiller</Badge>
                            )}
                          </TableCell>
                          <TableCell>{spiller.holdNavn}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          // # Hvis ingen spillere matcher søgningen eller ingen hold er tilmeldt
          <div className="text-center py-12 text-muted-foreground">
            <p>
              {searchQuery.trim() ? "Ingen spillere matcher søgningen." : "Ingen hold er tilmeldt træningen endnu."}
            </p>
            {searchQuery.trim() && (
              <Button variant="ghost" className="mt-2" onClick={() => setSearchQuery("")}>
                Ryd søgning
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || filteredSpillere.total === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gemmer...
            </>
          ) : (
            "Gem tilstedeværelse"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 