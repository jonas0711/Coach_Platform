"use client";

// Importerer nødvendige biblioteker og komponenter
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { 
  hentAlleKategorier, 
  hentAllePositioner, 
  hentAlleFokuspunkter,
  opdaterOevelse
} from "@/lib/db/actions";

// Skema for validering af øvelsesformulardata
const formSkema = z.object({
  navn: z.string().min(3, { message: "Navn skal være mindst 3 tegn" }),
  beskrivelse: z.string().optional(),
  billede: z.instanceof(FileList).optional(),
  brugerPositioner: z.boolean().default(false),
  minimumDeltagere: z.coerce.number().min(1, { message: "Minimum 1 deltager" }),
  kategori: z.string().optional(),
  nyKategori: z.string().optional(),
});

// Definerer typer til formulardata
type FormData = z.infer<typeof formSkema>;

// Typer til kategorier, positioner og fokuspunkter
interface Kategori {
  id: number;
  navn: string;
}

interface Position {
  id: number;
  navn: string;
  beskrivelse?: string;
  ikon?: string;
  erOffensiv: boolean;
  antalKraevet: number;
}

interface Fokuspunkt {
  id: number;
  navn: string;
  beskrivelse?: string;
}

// Interface for øvelsesdata
interface Oevelse {
  id: number;
  navn: string;
  beskrivelse?: string;
  billedeSti?: string;
  brugerPositioner: boolean;
  minimumDeltagere: number;
  kategoriId?: number;
  kategori?: {
    id: number;
    navn: string;
  };
  positioner?: Position[];
  fokuspunkter?: Fokuspunkt[];
}

// Props for redigeringsformularen
interface OevelseRedigerFormProps {
  oevelse: Oevelse;
}

// Redigeringsformular-komponent
export function OevelseRedigerForm({ oevelse }: OevelseRedigerFormProps) {
  // Hooks til navigation og toast-beskeder
  const router = useRouter();
  const { toast } = useToast();
  
  // State for data
  const [kategorier, setKategorier] = useState<Kategori[]>([]);
  const [alleFokuspunkter, setAlleFokuspunkter] = useState<Fokuspunkt[]>([]);
  const [valgteFokuspunkter, setValgteFokuspunkter] = useState<Fokuspunkt[]>(
    oevelse.fokuspunkter?.map(f => ({
      id: typeof f === 'string' ? -Math.floor(Math.random() * 10000) : f.id,
      navn: typeof f === 'string' ? f : f.tekst
    })) || []
  );
  const [nytFokuspunkt, setNytFokuspunkt] = useState("");
  const [allePositioner, setAllePositioner] = useState<Position[]>([]);
  const [valgtePositioner, setValgtePositioner] = useState<Position[]>(
    oevelse.positioner?.map(p => ({
      id: `${p.erOffensiv ? 'off' : 'def'}_${p.position}`,
      navn: p.position,
      beskrivelse: p.erOffensiv ? "Offensiv position" : "Defensiv position",
      erOffensiv: p.erOffensiv,
      antalKraevet: p.antalKraevet || 1
    })) || []
  );
  const [loading, setLoading] = useState(false);
  
  // Konfigurerer formular med foreløbige værdier fra den eksisterende øvelse
  const form = useForm<FormData>({
    resolver: zodResolver(formSkema),
    defaultValues: {
      navn: oevelse.navn || "",
      beskrivelse: oevelse.beskrivelse || "",
      brugerPositioner: oevelse.brugerPositioner || false,
      minimumDeltagere: oevelse.minimumDeltagere || 1,
      kategori: oevelse.kategoriId?.toString() || "",
      nyKategori: "",
    },
  });

  // Henter nødvendige data ved indlæsning
  useEffect(() => {
    async function hentData() {
      try {
        // Henter alle kategorier, positioner og fokuspunkter
        const [kategoriData, positionData, fokuspunktData] = await Promise.all([
          hentAlleKategorier(),
          hentAllePositioner(),
          hentAlleFokuspunkter()
        ]);
        
        setKategorier(kategoriData);
        // Konverterer positioner til det korrekte format
        const formatteredePositioner = [
          ...positionData.offensive.map((pos: string) => ({
            id: `off_${pos}`,
            navn: pos,
            beskrivelse: "Offensiv position",
            erOffensiv: true
          })),
          ...positionData.defensive.map((pos: string) => ({
            id: `def_${pos}`,
            navn: pos,
            beskrivelse: "Defensiv position",
            erOffensiv: false
          }))
        ];
        setAllePositioner(formatteredePositioner);
        setAlleFokuspunkter(fokuspunktData);
      } catch (error) {
        console.error("Fejl ved indlæsning af data:", error);
        toast({
          title: "Fejl ved indlæsning",
          description: "Der opstod en fejl ved indlæsning af data. Prøv igen senere.",
          variant: "destructive",
        });
      }
    }
    
    hentData();
  }, [toast]);

  // Håndterer tilføjelse af fokuspunkt
  const tilfoejFokuspunkt = (fokuspunkt: Fokuspunkt) => {
    // Tjekker om fokuspunktet allerede er valgt
    const erAlleredeValgt = valgteFokuspunkter.some(f => f.id === fokuspunkt.id);
    if (!erAlleredeValgt) {
      setValgteFokuspunkter([...valgteFokuspunkter, fokuspunkt]);
    }
  };

  // Håndterer oprettelse af nyt fokuspunkt
  const tilfoejNytFokuspunkt = () => {
    if (nytFokuspunkt.trim() !== "") {
      // Opretter foreløbigt fokuspunkt med negativ ID for at markere at det er nyt
      const midlertidigFokuspunkt: Fokuspunkt = {
        id: -Math.floor(Math.random() * 10000), // Tilfældig negativ ID for at markere at det skal oprettes
        navn: nytFokuspunkt.trim(),
      };
      setValgteFokuspunkter([...valgteFokuspunkter, midlertidigFokuspunkt]);
      setNytFokuspunkt("");
    }
  };

  // Håndterer fjernelse af fokuspunkt
  const fjernFokuspunkt = (id: number) => {
    setValgteFokuspunkter(valgteFokuspunkter.filter(f => f.id !== id));
  };

  // Håndterer valg af position
  const vaelgPosition = (position: Position) => {
    // Tjekker om positionen allerede er valgt
    const erAlleredeValgt = valgtePositioner.some(p => p.id === position.id);
    if (!erAlleredeValgt) {
      setValgtePositioner([...valgtePositioner, { ...position, antalKraevet: 1 }]);
    }
  };

  // Håndterer ændring af antal spillere for en position
  const opdaterAntalSpillere = (positionId: string, antal: number) => {
    setValgtePositioner(prevPositioner => 
      prevPositioner.map(pos => 
        pos.id === positionId 
          ? { ...pos, antalKraevet: Math.max(1, antal) }
          : pos
      )
    );
  };

  // Håndterer fjernelse af position
  const fjernPosition = (id: number) => {
    setValgtePositioner(valgtePositioner.filter(p => p.id !== id));
  };

  // Håndterer formularindsendelse
  async function onSubmit(data: FormData) {
    try {
      // Starter indlæsning
      setLoading(true);
      
      // Viser indlæsningsmeddelelse
      toast({
        title: "Opdaterer øvelse...",
        description: "Vent venligst, det kan tage et øjeblik.",
      });
      
      // Finder start-tidspunkt for at måle varigheden
      const startTid = new Date();
      
      // Forbereder positions-data
      const positioner = valgtePositioner.map((pos) => ({
        position: pos.navn,
        antalKraevet: pos.antalKraevet,
        erOffensiv: pos.erOffensiv
      }));
      
      // Opdeler fokuspunkter i eksisterende og nye
      const eksisterendeFokuspunkter = valgteFokuspunkter
        .filter((punkt) => punkt.id > 0)
        .map((punkt) => punkt.navn);
      
      const nyeFokuspunkter = valgteFokuspunkter
        .filter((punkt) => punkt.id < 0)
        .map((punkt) => punkt.navn);
      
      // Sammensætter alle fokuspunkter
      const alleFokuspunkter = [...eksisterendeFokuspunkter, ...nyeFokuspunkter];
      
      // Forbereder øvelsesdata
      const oevelseData = {
        navn: data.navn,
        beskrivelse: data.beskrivelse || "",
        brugerPositioner: data.brugerPositioner,
        minimumDeltagere: data.brugerPositioner ? undefined : data.minimumDeltagere,
        positioner: data.brugerPositioner ? positioner : undefined,
        kategori: data.nyKategori?.trim() || data.kategori || undefined,
        fokuspunkter: alleFokuspunkter.join(',')
      };
      
      // Sender opdateringsanmodning
      await opdaterOevelse(oevelse.id, oevelseData);
      
      // Måler varigheden
      const slutTid = new Date();
      const varighed = (slutTid.getTime() - startTid.getTime()) / 1000;
      
      // Viser bekræftelsesbesked
      toast({
        title: "Øvelse opdateret!",
        description: `Øvelsen blev opdateret på ${varighed.toFixed(1)} sekunder`,
      });
      
      // Omdirigerer til øvelseslisten
      router.push("/traening/oevelser");
      router.refresh();
    } catch (error) {
      console.error("Fejl ved opdatering af øvelse:", error);
      
      // Viser fejlbesked
      toast({
        title: "Fejl ved opdatering",
        description: error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen senere.",
        variant: "destructive",
      });
    } finally {
      // Afslutter indlæsning
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basisinformationsfelt */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basisinformation</h2>
            
            {/* Navnefelt */}
            <FormField
              control={form.control}
              name="navn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Navn på øvelse *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Beskrivelsesfelt */}
            <FormField
              control={form.control}
              name="beskrivelse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Beskriv øvelsen..." 
                      className="min-h-32"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Billedefelt */}
            <FormField
              control={form.control}
              name="billede"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Billede</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-4">
                      {oevelse.billedeSti && (
                        <div className="rounded-md overflow-hidden w-full max-w-sm">
                          <img 
                            src={oevelse.billedeSti} 
                            alt={oevelse.navn} 
                            className="w-full h-auto object-cover"
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            Nuværende billede. Upload et nyt for at erstatte det.
                          </p>
                        </div>
                      )}
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => onChange(e.target.files)}
                        {...fieldProps}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Valgfrit: Upload et billede for øvelsen (anbefalet str.: 800x600px)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Kategoriindstillinger */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Kategori</h2>
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="kategori"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vælg kategori</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vælg en kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ingen">Ingen kategori</SelectItem>
                        {kategorier.map((kategori) => (
                          <SelectItem key={kategori.id} value={kategori.id.toString()}>
                            {kategori.navn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nyKategori"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eller opret ny kategori</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Skriv ny kategori navn" />
                    </FormControl>
                    <FormDescription>
                      Hvis du vælger en eksisterende kategori, vil denne blive ignoreret
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Indstillinger for deltagere */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Indstillinger for deltagere</h2>
            
            <FormField
              control={form.control}
              name="brugerPositioner"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Positionsbaseret øvelse
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-1 h-5 w-5">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Vælg denne hvis øvelsen kræver bestemte positioner (f.eks. angribere, målmand)
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormDescription>
                      Aktivér dette hvis øvelsen kræver specifikke positioner
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          setValgtePositioner([]);
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {form.watch("brugerPositioner") ? (
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Vælg positioner og antal spillere</h3>
                
                {valgtePositioner.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {valgtePositioner.map((position) => (
                      <div key={position.id} className="flex items-center gap-2 bg-secondary p-2 rounded-lg">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          {position.navn}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => opdaterAntalSpillere(position.id, position.antalKraevet - 1)}
                          >
                            -
                          </Button>
                          <span className="min-w-[2rem] text-center">{position.antalKraevet}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => opdaterAntalSpillere(position.id, position.antalKraevet + 1)}
                          >
                            +
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 ml-1 hover:bg-destructive/20 rounded-full"
                            onClick={() => fjernPosition(position.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {allePositioner
                    .filter(pos => !valgtePositioner.some(v => v.id === pos.id))
                    .map((position) => (
                      <Button
                        key={position.id}
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => vaelgPosition(position)}
                      >
                        {position.ikon && (
                          <span className="mr-2">{position.ikon}</span>
                        )}
                        {position.navn}
                      </Button>
                    ))}
                </div>
                
                {valgtePositioner.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Vælg mindst en position for øvelsen
                  </p>
                )}
              </div>
            ) : (
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
                      Angiv det mindste antal spillere, der kræves for at udføre øvelsen
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          {/* Fokusupdukter */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Fokuspunkter</h2>
            
            <Tabs defaultValue="eksisterende">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="eksisterende">Eksisterende fokuspunkter</TabsTrigger>
                <TabsTrigger value="nyt">Tilføj nyt fokuspunkt</TabsTrigger>
              </TabsList>
              
              <TabsContent value="eksisterende" className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {alleFokuspunkter
                    .filter(punkt => !valgteFokuspunkter.some(v => v.id === punkt.id))
                    .map((fokuspunkt) => (
                      <Button
                        key={fokuspunkt.id}
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => tilfoejFokuspunkt(fokuspunkt)}
                      >
                        {fokuspunkt.tekst}
                      </Button>
                    ))}
                </div>
                {alleFokuspunkter.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ingen eksisterende fokuspunkter. Opret et nyt.
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="nyt">
                <div className="flex space-x-2">
                  <Input
                    value={nytFokuspunkt}
                    onChange={(e) => setNytFokuspunkt(e.target.value)}
                    placeholder="Skriv nyt fokuspunkt..."
                  />
                  <Button 
                    type="button" 
                    onClick={tilfoejNytFokuspunkt}
                    disabled={nytFokuspunkt.trim() === ""}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tilføj
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            {valgteFokuspunkter.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Valgte fokuspunkter:</h3>
                <div className="flex flex-wrap gap-2">
                  {valgteFokuspunkter.map((fokuspunkt) => (
                    <Badge 
                      key={fokuspunkt.id} 
                      variant="secondary" 
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground"
                    >
                      {fokuspunkt.navn}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4 ml-1 hover:bg-destructive/20 rounded-full p-0"
                        onClick={() => fjernFokuspunkt(fokuspunkt.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Indsendelsesknapper */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Annuller
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Opdaterer..." : "Gem ændringer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 