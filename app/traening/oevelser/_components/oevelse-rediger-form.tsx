"use client";

// Importerer nødvendige biblioteker og komponenter
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
  opdaterOevelse,
  type OevelseData,
  type OevelsePosition,
  type OevelseVariation
} from "@/lib/db/actions";

// Skema for validering af øvelsesformulardata
const formSkema = z.object({
  navn: z.string().min(3, { message: "Navn skal være mindst 3 tegn" }),
  beskrivelse: z.string().optional(),
  billede: z.instanceof(FileList).optional(),
  brugerPositioner: z.boolean().default(false),
  minimumDeltagere: z.coerce.number().min(1, { message: "Minimum 1 deltager" }).optional(),
  kategori: z.string().optional(),
  nyKategori: z.string().optional(),
  fokuspunkter: z.string().optional(),
  originalPositionerNavn: z.string().optional(),
  positioner: z.array(z.object({
    position: z.string(),
    antalKraevet: z.number(),
    erOffensiv: z.boolean()
  })).optional(),
  variationer: z.array(z.object({
    navn: z.string(),
    beskrivelse: z.string().optional(),
    positioner: z.array(z.object({
      position: z.string(),
      antalKraevet: z.number(),
      erOffensiv: z.boolean()
    }))
  })).optional()
});

// Definerer typer til formulardata
type FormData = z.infer<typeof formSkema>;

// Typer til kategorier og fokuspunkter
interface Kategori {
  id: number;
  navn: string;
}

interface Fokuspunkt {
  id: string;
  navn: string;
  beskrivelse?: string;
}

// Interface for position i UI
interface UiPosition {
  id: string;
  navn: string;
  beskrivelse: string;
  erOffensiv: boolean;
  antalKraevet: number;
}

// Interface for variation i UI
interface UiVariation {
  navn: string;
  beskrivelse?: string;
  positioner: UiPosition[];
}

// Props for redigeringsformularen
interface OevelseRedigerFormProps {
  oevelse: OevelseData & { 
    id: number;
    kategori?: { 
      id: number;
      navn: string;
    } | null;
  };
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
    Array.isArray(oevelse.fokuspunkter) 
      ? oevelse.fokuspunkter.map(f => ({
          id: f.id.toString(),
          navn: f.tekst,
          beskrivelse: undefined
        }))
      : oevelse.fokuspunkter?.split(',').map(f => ({
          id: `existing_${f.trim()}`,
          navn: f.trim(),
          beskrivelse: undefined
        })) || []
  );
  const [nytFokuspunkt, setNytFokuspunkt] = useState("");
  const [allePositioner, setAllePositioner] = useState<UiPosition[]>([]);
  const [valgtePositioner, setValgtePositioner] = useState<UiPosition[]>(
    oevelse.positioner?.map(p => ({
      id: p.position,
      navn: p.position,
      beskrivelse: p.erOffensiv ? "Offensiv position" : "Defensiv position",
      erOffensiv: p.erOffensiv,
      antalKraevet: p.antalKraevet
    })) || []
  );
  const [originalNavn, setOriginalNavn] = useState<string>("Original");
  const [variationer, setVariationer] = useState<UiVariation[]>(
    oevelse.variationer?.map((v, vIndex) => ({
      navn: v.navn,
      beskrivelse: v.beskrivelse,
      positioner: v.positioner?.map(p => ({
        id: p.position,
        navn: p.position,
        beskrivelse: p.erOffensiv ? "Offensiv position" : "Defensiv position",
        erOffensiv: p.erOffensiv,
        antalKraevet: p.antalKraevet
      })) || []
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
      kategori: oevelse.kategori?.navn || "",
      nyKategori: "",
      originalPositionerNavn: oevelse.originalPositionerNavn || "Original opsætning",
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
        const konverterdePositioner: UiPosition[] = [
          ...positionData.offensive.map((pos: string) => ({
            id: pos,
            navn: pos,
            beskrivelse: "Offensiv position",
            erOffensiv: true,
            antalKraevet: 0
          })),
          ...positionData.defensive.map((pos: string) => ({
            id: pos,
            navn: pos,
            beskrivelse: "Defensiv position",
            erOffensiv: false,
            antalKraevet: 0
          }))
        ];
        
        setAllePositioner(konverterdePositioner);
        
        // Konverterer fokuspunkter til det korrekte format
        const formatteredeFokuspunkter: Fokuspunkt[] = fokuspunktData.map((fp: any) => ({
          id: fp.id.toString(),
          navn: fp.navn,
          beskrivelse: fp.beskrivelse
        }));
        
        setAlleFokuspunkter(formatteredeFokuspunkter);
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
    const erAlleredeValgt = valgteFokuspunkter.some(f => f.id === fokuspunkt.id);
    if (!erAlleredeValgt) {
      setValgteFokuspunkter([...valgteFokuspunkter, fokuspunkt]);
    }
  };

  // Håndterer oprettelse af nyt fokuspunkt
  const tilfoejNytFokuspunkt = () => {
    if (nytFokuspunkt.trim() !== "") {
      const midlertidigFokuspunkt: Fokuspunkt = {
        id: `new_${Math.random().toString(36).substr(2, 9)}`,
        navn: nytFokuspunkt.trim(),
        beskrivelse: undefined
      };
      setValgteFokuspunkter([...valgteFokuspunkter, midlertidigFokuspunkt]);
      setNytFokuspunkt("");
    }
  };

  // Håndterer fjernelse af fokuspunkt
  const fjernFokuspunkt = (fokuspunktId: string) => {
    setValgteFokuspunkter(valgteFokuspunkter.filter(f => f.id !== fokuspunktId));
  };

  // Håndterer valg af position
  const vaelgPosition = (position: UiPosition) => {
    const erAlleredeValgt = valgtePositioner.some(p => p.navn === position.navn);
    if (!erAlleredeValgt) {
      const nyPosition = {
        ...position,
        id: position.navn,
        antalKraevet: 1
      };
      setValgtePositioner([...valgtePositioner, nyPosition]);
    }
  };

  // Håndterer ændring af antal spillere for en position
  const opdaterAntalSpillere = (positionId: string, antal: number) => {
    const nyePositioner = [...valgtePositioner];
    const positionIndex = nyePositioner.findIndex(p => p.navn === positionId);
    
    if (positionIndex !== -1) {
      nyePositioner[positionIndex] = {
        ...nyePositioner[positionIndex],
        antalKraevet: antal
      };
      setValgtePositioner(nyePositioner);
    }
  };

  // Håndterer fjernelse af position
  const fjernPosition = (positionId: string) => {
    setValgtePositioner(valgtePositioner.filter(p => p.navn !== positionId));
  };

  // Håndterer kategori valg
  const handleKategoriValg = (kategori: string) => {
    form.setValue("kategori", kategori);
  };

  // Håndterer tilføjelse af variation
  const tilfoejVariation = () => {
    setVariationer([...variationer, {
      navn: "Ny variation",
      beskrivelse: "",
      positioner: []
    }]);
  };

  // Håndterer opdatering af variations navn
  const opdaterVariationNavn = (index: number, nytNavn: string) => {
    const nyeVariationer = [...variationer];
    nyeVariationer[index].navn = nytNavn;
    setVariationer(nyeVariationer);
  };

  // Håndterer tilføjelse af position til variation
  const tilfoejPositionTilVariation = (variationIndex: number, position: UiPosition) => {
    const nyeVariationer = [...variationer];
    const positionId = position.navn;
    const erAlleredeValgt = nyeVariationer[variationIndex].positioner.some(p => p.navn === position.navn);
    
    if (!erAlleredeValgt) {
      nyeVariationer[variationIndex].positioner.push({ 
        ...position, 
        id: positionId,
        antalKraevet: 1 
      });
      setVariationer(nyeVariationer);
    }
  };

  // Håndterer opdatering af antal spillere i variation
  const opdaterVariationAntalSpillere = (variationIndex: number, positionId: string, antal: number) => {
    const nyeVariationer = [...variationer];
    // Opdater antallet for positionen, behold den selv hvis antal er 0
    nyeVariationer[variationIndex].positioner = nyeVariationer[variationIndex].positioner.map((pos: UiPosition) =>
      pos.navn === positionId ? { ...pos, antalKraevet: antal } : pos
    );
    setVariationer(nyeVariationer);
  };

  // Håndterer fjernelse af position fra variation
  const fjernPositionFraVariation = (variationIndex: number, positionId: string) => {
    const nyeVariationer = [...variationer];
    nyeVariationer[variationIndex].positioner = nyeVariationer[variationIndex].positioner.filter(p => p.navn !== positionId);
    setVariationer(nyeVariationer);
  };

  // Håndterer fjernelse af variation
  const fjernVariation = (index: number) => {
    setVariationer(variationer.filter((_, i) => i !== index));
  };

  // Håndterer formularindsendelse
  async function onSubmit(data: FormData) {
    try {
      setLoading(true);
      
      // Forbereder positions-data hvis brugerPositioner er true
      const positioner = data.brugerPositioner ? valgtePositioner.map(pos => ({
        position: pos.navn,
        antalKraevet: pos.antalKraevet,
        erOffensiv: pos.erOffensiv
      })) : undefined;
      
      // Forbereder variations-data og fjern prefixes fra ID'er
      const variationsData = variationer.map(v => ({
        navn: v.navn,
        beskrivelse: v.beskrivelse || "",
        positioner: v.positioner.map(p => ({
          position: p.navn,
          antalKraevet: p.antalKraevet,
          erOffensiv: p.erOffensiv
        }))
      }));
      
      // Sender opdateret data til serveren
      await opdaterOevelse(oevelse.id, {
        ...data,
        positioner,
        fokuspunkter: valgteFokuspunkter.map(fp => fp.navn).join(','),
        variationer: variationsData,
        originalPositionerNavn: data.originalPositionerNavn || "Original opsætning"
      });
      
      // Viser success besked
      toast({
        title: "Øvelse opdateret",
        description: "Ændringerne er blevet gemt.",
      });
      
      // Navigerer tilbage
      router.push('/traening/oevelser');
      router.refresh();
    } catch (error) {
      console.error("Fejl ved opdatering:", error);
      toast({
        title: "Fejl ved opdatering",
        description: error instanceof Error ? error.message : "Der skete en uventet fejl",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Basis information */}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="navn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Navn</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <Select
                    value={field.value}
                    onValueChange={handleKategoriValg}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategorier.map((kategori) => (
                        <SelectItem key={kategori.id} value={kategori.navn}>
                          {kategori.navn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Positioner */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="brugerPositioner"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Brug positioner</FormLabel>
                  </div>
                  <FormDescription>
                    Vælg om øvelsen skal bruge specifikke positioner eller bare et minimum antal spillere
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch("brugerPositioner") ? (
              <div className="space-y-8">
                {/* Original opsætning */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormField
                      control={form.control}
                      name="originalPositionerNavn"
                      render={({ field }) => (
                        <FormItem className="flex-1 max-w-xs">
                          <FormLabel>Navn på original opsætning</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="F.eks. Højre side" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Offensive positioner */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Offensive positioner</h4>
                      <div className="space-y-2">
                        {allePositioner
                          .filter(p => p.erOffensiv)
                          .map((position) => (
                            <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="font-medium">{position.navn}</div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const pos = valgtePositioner.find(p => p.navn === position.navn);
                                    if (pos) {
                                      opdaterAntalSpillere(position.navn, Math.max(0, pos.antalKraevet - 1));
                                    }
                                  }}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center">
                                  {valgtePositioner.find(p => p.navn === position.navn)?.antalKraevet || 0}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const pos = valgtePositioner.find(p => p.navn === position.navn);
                                    if (pos) {
                                      opdaterAntalSpillere(position.navn, pos.antalKraevet + 1);
                                    } else {
                                      vaelgPosition({ ...position, antalKraevet: 1 });
                                    }
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    {/* Defensive positioner */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Defensive positioner</h4>
                      <div className="space-y-2">
                        {allePositioner
                          .filter(p => !p.erOffensiv)
                          .map((position) => (
                            <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="font-medium">{position.navn}</div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const pos = valgtePositioner.find(p => p.navn === position.navn);
                                    if (pos) {
                                      opdaterAntalSpillere(position.navn, Math.max(0, pos.antalKraevet - 1));
                                    }
                                  }}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center">
                                  {valgtePositioner.find(p => p.navn === position.navn)?.antalKraevet || 0}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const pos = valgtePositioner.find(p => p.navn === position.navn);
                                    if (pos) {
                                      opdaterAntalSpillere(position.navn, pos.antalKraevet + 1);
                                    } else {
                                      vaelgPosition({ ...position, antalKraevet: 1 });
                                    }
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variationer */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Variationer</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={tilfoejVariation}
                    >
                      Tilføj variation
                    </Button>
                  </div>

                  {variationer.map((variation, index) => (
                    <div key={index} className="space-y-4 border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <Input
                          value={variation.navn}
                          onChange={(e) => opdaterVariationNavn(index, e.target.value)}
                          placeholder="Variationens navn"
                          className="max-w-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fjernVariation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={variation.beskrivelse}
                        onChange={(e) => {
                          const nyeVariationer = [...variationer];
                          nyeVariationer[index].beskrivelse = e.target.value;
                          setVariationer(nyeVariationer);
                        }}
                        placeholder="Beskrivelse af variationen"
                        className="min-h-[100px]"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Offensive positioner */}
                        <div className="space-y-2">
                          <h4 className="font-medium">Offensive positioner</h4>
                          <div className="space-y-2">
                            {allePositioner
                              .filter(p => p.erOffensiv)
                              .map((position) => (
                                <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="font-medium">{position.navn}</div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const pos = variation.positioner.find(p => p.navn === position.navn);
                                        if (pos) {
                                          opdaterVariationAntalSpillere(index, position.navn, Math.max(0, pos.antalKraevet - 1));
                                        }
                                      }}
                                    >
                                      -
                                    </Button>
                                    <span className="w-8 text-center">
                                      {variation.positioner.find(p => p.navn === position.navn)?.antalKraevet || 0}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const pos = variation.positioner.find(p => p.navn === position.navn);
                                        if (pos) {
                                          opdaterVariationAntalSpillere(index, position.navn, pos.antalKraevet + 1);
                                        } else {
                                          tilfoejPositionTilVariation(index, { ...position, antalKraevet: 1 });
                                        }
                                      }}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Defensive positioner */}
                        <div className="space-y-2">
                          <h4 className="font-medium">Defensive positioner</h4>
                          <div className="space-y-2">
                            {allePositioner
                              .filter(p => !p.erOffensiv)
                              .map((position) => (
                                <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="font-medium">{position.navn}</div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const pos = variation.positioner.find(p => p.navn === position.navn);
                                        if (pos) {
                                          opdaterVariationAntalSpillere(index, position.navn, Math.max(0, pos.antalKraevet - 1));
                                        }
                                      }}
                                    >
                                      -
                                    </Button>
                                    <span className="w-8 text-center">
                                      {variation.positioner.find(p => p.navn === position.navn)?.antalKraevet || 0}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        const pos = variation.positioner.find(p => p.navn === position.navn);
                                        if (pos) {
                                          opdaterVariationAntalSpillere(index, position.navn, pos.antalKraevet + 1);
                                        } else {
                                          tilfoejPositionTilVariation(index, { ...position, antalKraevet: 1 });
                                        }
                                      }}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          {/* Submit knapper */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opdaterer...
                </>
              ) : (
                "Gem ændringer"
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.push('/traening/oevelser')}
            >
              Fortryd
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 