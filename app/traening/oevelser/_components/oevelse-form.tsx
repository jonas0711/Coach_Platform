'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { opretOevelse } from '@/lib/db/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Plus, 
  Minus, 
  Upload, 
  CheckCircle,
  Tag,
  Target,
  ChevronsUpDown,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Position as PositionEnum } from "@/lib/db/schema";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Kategorier for øvelser
const KATEGORIER = [
  "Angreb",
  "Forsvar",
  "Kondition",
  "Teknik",
  "Taktik",
  "Opvarmning",
  "Afslutning",
  "Styrke",
  "Koordination",
  "Andet"
];

// Valideringsschema for øvelsesformularen
const formSchema = z.object({
  navn: z.string().min(2, { message: "Navn skal være mindst 2 tegn" }).max(50),
  beskrivelse: z.string().min(10, { message: "Beskrivelse skal være mindst 10 tegn" }).max(500),
  billede: z.instanceof(File).optional(),
  kategori: z.string().optional(),
  fokuspunkter: z.string().optional(),
  // Valg mellem positioner eller minimum antal deltagere
  brugerPositioner: z.enum(['true', 'false']),
  minimumDeltagere: z.coerce.number().min(1).optional(),
  antalOffensivePositioner: z.number().min(0).max(5),
  antalDefensivePositioner: z.number().min(0).max(5),
});

// Form værdier type baseret på validerings-skemaet
type FormValues = z.infer<typeof formSchema>;

// Props interface til OevelseForm komponenten
export interface OevelseFormProps {
  offensivePositioner: string[];
  defensivePositioner: string[];
  kategorier: string[];
  fokuspunkter: string[];
}

// Formularen til at oprette øvelser
export function OevelseForm({ offensivePositioner, defensivePositioner, kategorier, fokuspunkter }: OevelseFormProps) {
  // Router til at navigere efter oprettelse
  const router = useRouter();
  
  // Tilføj state til at håndtere lokale kategorier
  const [lokaleKategorier, setLokaleKategorier] = useState<string[]>(kategorier);
  
  // Tilføj state til at håndtere lokale fokuspunkter
  const [lokaleFokuspunkter, setLokaleFokuspunkter] = useState<string[]>(fokuspunkter);
  
  // Tilstand til at holde styr på positioner
  const [offensivePositionerState, setOffensivePositionerState] = useState<PositionEnum[]>(offensivePositioner.map(position => ({
    position,
    antalKraevet: 0,
    erOffensiv: true,
  })));
  
  const [defensivePositionerState, setDefensivePositionerState] = useState<PositionEnum[]>(defensivePositioner.map(position => ({
    position,
    antalKraevet: 0,
    erOffensiv: false,
  })));
  
  // Tilstand til at holde styr på billedet
  const [billede, setBillede] = useState<File | null>(null);
  const [billedePreview, setBilledePreview] = useState<string | null>(null);
  const [erIndsendt, setErIndsendt] = useState(false);
  
  // Tilstand til at holde styr på fokuspunkter
  const [fokuspunkterState, setFokuspunkterState] = useState<string[]>(['']);
  
  // Tilstand til at tracke valgte fokuspunkter for at undgå duplikater
  const [valgteFokuspunkter, setValgteFokuspunkter] = useState<Set<string>>(new Set());
  
  // Opsætning af formularen med validering
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: '',
      beskrivelse: '',
      kategori: '',
      fokuspunkter: '',
      brugerPositioner: 'false',
      minimumDeltagere: 1,
      antalOffensivePositioner: 0,
      antalDefensivePositioner: 0,
    },
  });
  
  // Hent formularværdier
  const watchBrugerPositioner = form.watch("brugerPositioner") === 'true';
  
  // Opdater billedepreview når billedet ændres
  useEffect(() => {
    if (!billede) {
      setBilledePreview(null);
      return;
    }
    
    const objectUrl = URL.createObjectURL(billede);
    setBilledePreview(objectUrl);
    
    // Ryd op til objektet når komponenten opdateres
    return () => URL.revokeObjectURL(objectUrl);
  }, [billede]);
  
  // Initialiser fokuspunkter ved opstart for at undgå duplikater
  useEffect(() => {
    // Hvis vi har nogle fokuspunkter ved opstart, tilføj dem til valgteFokuspunkter
    const initialFokuspunkter = new Set<string>();
    
    // Tilføj alle fokuspunkter fra fokuspunkterState som ikke er tomme
    fokuspunkterState.forEach(fp => {
      if (fp && fp.trim() !== '') {
        initialFokuspunkter.add(fp);
      }
    });
    
    // Opdater kun hvis der er noget at opdatere
    if (initialFokuspunkter.size > 0) {
      setValgteFokuspunkter(initialFokuspunkter);
    }
  }, []); // Kør kun ved indlæsning af komponenten
  
  // Håndter billede input ændringer
  const handleBilledeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setBillede(null);
      return;
    }
    
    setBillede(e.target.files[0]);
  };
  
  // Funktion til at øge antallet af en position
  const handleIncrement = (position: string, erOffensiv: boolean) => {
    if (erOffensiv) {
      setOffensivePositionerState(positions => 
        positions.map(p => p.position === position 
          ? { ...p, antalKraevet: p.antalKraevet + 1 } 
          : p
        )
      );
    } else {
      setDefensivePositionerState(positions => 
        positions.map(p => p.position === position 
          ? { ...p, antalKraevet: p.antalKraevet + 1 } 
          : p
        )
      );
    }
  };
  
  // Funktion til at mindske antallet af en position
  const handleDecrement = (position: string, erOffensiv: boolean) => {
    if (erOffensiv) {
      setOffensivePositionerState(positions => 
        positions.map(p => p.position === position 
          ? { ...p, antalKraevet: Math.max(0, p.antalKraevet - 1) } 
          : p
        )
      );
    } else {
      setDefensivePositionerState(positions => 
        positions.map(p => p.position === position 
          ? { ...p, antalKraevet: Math.max(0, p.antalKraevet - 1) } 
          : p
        )
      );
    }
  };
  
  // Funktioner til at håndtere fokuspunkter
  const addFokuspunkt = () => {
    setFokuspunkterState([...fokuspunkterState, '']);
  };

  const removeFokuspunkt = (index: number) => {
    const nyeFokuspunkter = [...fokuspunkterState];
    
    // Fjern fokuspunkt fra de valgte, hvis det var valgt
    if (nyeFokuspunkter[index] && nyeFokuspunkter[index].trim() !== '') {
      const opdateredeValgte = new Set(valgteFokuspunkter);
      opdateredeValgte.delete(nyeFokuspunkter[index]);
      setValgteFokuspunkter(opdateredeValgte);
    }
    
    nyeFokuspunkter.splice(index, 1);
    setFokuspunkterState(nyeFokuspunkter);
    
    // Opdater form værdi
    form.setValue('fokuspunkter', nyeFokuspunkter.filter(p => p.trim() !== '').join('\n'));
  };
  
  // Håndter ændring i fokuspunkt input
  const handleFokuspunktChange = (index: number, value: string) => {
    console.log("Fokuspunkt ændret:", index, value);
    const nyeFokuspunkter = [...fokuspunkterState];
    
    // Hvis vi ændrer et eksisterende fokuspunkt, fjern det fra valgte
    if (fokuspunkterState[index] && fokuspunkterState[index].trim() !== '' && 
        valgteFokuspunkter.has(fokuspunkterState[index])) {
      const nyeValgteFokuspunkter = new Set(valgteFokuspunkter);
      nyeValgteFokuspunkter.delete(fokuspunkterState[index]);
      setValgteFokuspunkter(nyeValgteFokuspunkter);
    }
    
    nyeFokuspunkter[index] = value;
    setFokuspunkterState(nyeFokuspunkter);
    
    // Opdater form værdi
    form.setValue('fokuspunkter', nyeFokuspunkter.filter(p => p.trim() !== '').join('\n'));
  };
  
  // Filtrer fokuspunkter baseret på input
  const getFiltreretFokuspunkter = (index: number) => {
    const currentValue = fokuspunkterState[index].toLowerCase();
    
    if (!currentValue) return lokaleFokuspunkter;
    
    // Filtrér baseret på input og ekskluder allerede valgte fokuspunkter
    return lokaleFokuspunkter.filter(fp => 
      fp.toLowerCase().includes(currentValue) && 
      !Array.from(valgteFokuspunkter).some(v => v === fp && fp !== fokuspunkterState[index])
    );
  };
  
  // Funktion til at vælge et fokuspunkt
  const handleSelectFokuspunkt = (index: number, value: string) => {
    // Tjek om fokuspunktet allerede er valgt
    if (valgteFokuspunkter.has(value) && !fokuspunkterState[index].includes(value)) {
      // Vis en toast-besked om at fokuspunktet allerede er valgt
      toast({
        title: "Fokuspunkt allerede valgt",
        description: `"${value}" er allerede tilføjet som fokuspunkt.`,
        variant: "destructive",
      });
      return;
    }
    
    // Opdater valgte fokuspunkter
    const nyeValgteFokuspunkter = new Set(valgteFokuspunkter);
    
    // Hvis vi erstatter et eksisterende fokuspunkt, fjern det fra listen
    if (fokuspunkterState[index] && fokuspunkterState[index].trim() !== '') {
      nyeValgteFokuspunkter.delete(fokuspunkterState[index]);
    }
    
    // Tilføj det nye fokuspunkt
    nyeValgteFokuspunkter.add(value);
    setValgteFokuspunkter(nyeValgteFokuspunkter);
    
    // Opdater fokuspunkt listen
    const nyeFokuspunkter = [...fokuspunkterState];
    nyeFokuspunkter[index] = value;
    setFokuspunkterState(nyeFokuspunkter);
    
    // Opdater form værdi
    form.setValue('fokuspunkter', nyeFokuspunkter.filter(p => p.trim() !== '').join('\n'));
  };
  
  // Håndter indsendelse af formularen
  const onSubmit = async (values: FormValues) => {
    try {
      setErIndsendt(true);
      
      // # Tilføj tidstagning for at måle ydeevne
      const startTid = performance.now();
      console.log("Starter oprettelse af øvelse...");
      
      // # Informer brugeren om at processen er startet
      toast({
        title: "Opretter øvelse...",
        description: "Dette kan tage et øjeblik. Vent venligst mens databasen opdateres."
      });
      
      // # Gem alle fokuspunkter til lokal state
      const fokuspunktListe = values.fokuspunkter?.split(/[\n,]/)
        .map(fp => fp.trim())
        .filter(fp => fp !== "") || [];
        
      // # Tilføj nye fokuspunkter til lokaleFokuspunkter
      if (fokuspunktListe.length > 0) {
        const nyeFokuspunkter = [...lokaleFokuspunkter];
        let tilføjet = false;
        
        fokuspunktListe.forEach(fp => {
          if (!nyeFokuspunkter.includes(fp)) {
            nyeFokuspunkter.push(fp);
            tilføjet = true;
          }
        });
        
        if (tilføjet) {
          console.log("Nye fokuspunkter tilføjet:", fokuspunktListe);
          setLokaleFokuspunkter(nyeFokuspunkter);
        }
      }
      
      // # Tilføj den nye kategori til lokaleKategorier, hvis det ikke allerede findes
      if (values.kategori && values.kategori.trim() !== "" && !lokaleKategorier.includes(values.kategori)) {
        const nyKategori = values.kategori.trim();
        console.log("Ny kategori gemmes:", nyKategori);
        setLokaleKategorier([...lokaleKategorier, nyKategori]);
      }
      
      // # Forbered positioner hvis de bruges
      let positioner: PositionEnum[] = [];
      
      if (values.brugerPositioner === 'true') {
        positioner = [
          ...offensivePositionerState.filter(p => p.antalKraevet > 0),
          ...defensivePositionerState.filter(p => p.antalKraevet > 0)
        ];
        
        // # Tjek om der er valgt mindst én position
        if (positioner.length === 0) {
          form.setError('brugerPositioner', { 
            message: 'Du skal vælge mindst én position med mindst 1 spiller'
          });
          setErIndsendt(false);
          return;
        }
      }
      
      // # Håndter billede upload (i en rigtig implementering ville vi uploade billedet til en server)
      // # For nu gemmer vi bare en placeholder sti
      let billedeSti = undefined;
      if (billede) {
        // # I en rigtig implementering ville vi uploade billedet her
        // # Eksempel på hvordan en URL kunne se ud:
        billedeSti = "/images/oevelser/placeholder.jpg";
      }
      
      // # Opret øvelsen
      console.log("Sender data til databasen...");
      await opretOevelse({
        navn: values.navn,
        beskrivelse: values.beskrivelse,
        billedeSti,
        brugerPositioner: values.brugerPositioner === 'true',
        minimumDeltagere: values.brugerPositioner === 'false' ? values.minimumDeltagere : undefined,
        positioner: values.brugerPositioner === 'true' ? positioner : undefined,
        kategori: values.kategori,
        fokuspunkter: values.fokuspunkter,
      });
      
      // # Mål tiden det tog at oprette øvelsen
      const slutTid = performance.now();
      const tidBrugt = ((slutTid - startTid) / 1000).toFixed(2);
      console.log(`Øvelse oprettet på ${tidBrugt} sekunder`);
      
      // # Vis succesbesked
      toast({
        title: "Øvelse oprettet!",
        description: `Øvelsen er blevet tilføjet til dit bibliotek på ${tidBrugt} sekunder.`
      });
      
      // # Nulstil formen
      form.reset();
      setBillede(null);
      setFokuspunkterState(['']);
      setOffensivePositionerState(offensivePositioner.map(position => ({
        position,
        antalKraevet: 0,
        erOffensiv: true,
      })));
      setDefensivePositionerState(defensivePositioner.map(position => ({
        position,
        antalKraevet: 0,
        erOffensiv: false,
      })));
      
      // # Naviger tilbage til oversigten
      router.push('/traening/oevelser');
      router.refresh();
    } catch (error) {
      // # Vis fejlbesked
      toast({
        title: "Fejl ved oprettelse",
        description: error instanceof Error ? error.message : "Der skete en fejl",
        variant: "destructive"
      });
      setErIndsendt(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Opret ny øvelse</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basisinformation */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="navn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Øvelsesnavn</FormLabel>
                    <FormControl>
                      <Input placeholder="Skriv et navn til øvelsen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="kategori"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <div className="w-full flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={field.value || undefined}
                          onValueChange={(value) => {
                            console.log("Kategori valgt:", value);
                            form.setValue("kategori", value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Vælg eller opret kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Brug lokaleKategorier i stedet for kategorier prop */}
                            {lokaleKategorier.map((kategori) => (
                              <SelectItem key={kategori} value={kategori}>
                                {kategori}
                              </SelectItem>
                            ))}
                            {/* Option for custom input hvis inputtet ikke findes allerede */}
                            {field.value && field.value.trim() !== '' && !lokaleKategorier.includes(field.value) && (
                              <SelectItem value={field.value}>
                                Opret: {field.value}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => {
                          const nyKategoriInput = window.prompt("Indtast ny kategori");
                          if (nyKategoriInput && nyKategoriInput.trim() !== "") {
                            const nyKategori = nyKategoriInput.trim();
                            console.log("Tilføjer ny kategori:", nyKategori);
                            
                            // Opdater lokale kategorier
                            if (!lokaleKategorier.includes(nyKategori)) {
                              setLokaleKategorier(prev => [...prev, nyKategori]);
                              console.log("Lokale kategorier opdateret:", [...lokaleKategorier, nyKategori]);
                            }
                            
                            // Tilføj den nye kategori direkte til form værdi
                            form.setValue("kategori", nyKategori);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      Vælg den kategori som øvelsen hører under eller opret en ny
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Beskrivelse */}
            <FormField
              control={form.control}
              name="beskrivelse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Beskriv øvelsen her..." 
                      className="resize-none min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Giv en detaljeret beskrivelse af hvordan øvelsen udføres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Billede upload */}
            <div className="space-y-3">
              <Label>Billede (valgfrit)</Label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="billede"
                      type="file"
                      accept="image/*"
                      onChange={handleBilledeChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('billede')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Vælg billede
                    </Button>
                    {billede && (
                      <div className="text-sm">
                        {billede.name} ({Math.round(billede.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Maksimalt 2MB, formater: JPG, PNG, GIF
                  </div>
                </div>
                
                {billedePreview && (
                  <div className="sm:w-32 sm:h-32 w-full h-40 rounded-md overflow-hidden border">
                    <img src={billedePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Fokuspunkter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fokuspunkter</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addFokuspunkt}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tilføj fokuspunkt
                </Button>
              </div>
              
              <FormDescription>
                Tilføj fokuspunkter som træneren skal være opmærksom på
              </FormDescription>
              
              <div className="space-y-2">
                {fokuspunkterState.map((punkt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="relative flex-1">
                      <div className="flex space-x-2">
                        <Input
                          placeholder={`Skriv fokuspunkt ${index + 1}`}
                          value={punkt}
                          onChange={(e) => handleFokuspunktChange(index, e.target.value)}
                        />
                        
                        <div className="relative w-full max-w-[180px]">
                          <Select
                            onValueChange={(value) => {
                              console.log("Vælger fokuspunkt fra dropdown:", value);
                              handleSelectFokuspunkt(index, value);
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Vælg eksisterende" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFiltreretFokuspunkter(index).map((fp) => (
                                <SelectItem key={fp} value={fp}>
                                  {fp}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {fokuspunkterState.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFokuspunkt(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Vælg mellem positioner eller minimum antal */}
            <FormField
              control={form.control}
              name="brugerPositioner"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Spilleropsætning</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="false" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Minimum antal spillere
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="true" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Specifikke positioner
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Vis enten minimum antal eller positionsvælgere */}
            {!watchBrugerPositioner ? (
              <FormField
                control={form.control}
                name="minimumDeltagere"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum antal deltagere</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      Angiv det mindste antal spillere der skal bruges til øvelsen
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-6">
                {/* Offensive positioner */}
                <div className="space-y-3">
                  <Label>Offensive positioner</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {offensivePositionerState.map((position) => (
                      <div 
                        key={position.position} 
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="font-medium">{position.position}</div>
                        <div className="flex items-center gap-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleDecrement(position.position, true)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="w-8 text-center">{position.antalKraevet}</div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleIncrement(position.position, true)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Defensive positioner */}
                <div className="space-y-3">
                  <Label>Defensive positioner</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {defensivePositionerState.map((position) => (
                      <div 
                        key={position.position} 
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="font-medium">{position.position}</div>
                        <div className="flex items-center gap-1">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleDecrement(position.position, false)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="w-8 text-center">{position.antalKraevet}</div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleIncrement(position.position, false)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Submit knap */}
            <Button type="submit" disabled={erIndsendt} className="w-full md:w-auto">
              {erIndsendt ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opretter øvelse... Dette kan tage et øjeblik
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Opret øvelse
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 