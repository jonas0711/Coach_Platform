'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, ChevronUp, X, Tag, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { opdaterLokalTraeningOevelse } from '../actions';

// # Valideringsschema for redigeringsformularen
const formSchema = z.object({
  navn: z.string().min(3, { message: "Navn skal være mindst 3 tegn" }).max(50),
  beskrivelse: z.string().optional(),
  kategoriNavn: z.string().optional(),
  fokuspunkter: z.array(z.string()).optional(),
});

// # Form værdier type baseret på validerings-skemaet
type FormValues = z.infer<typeof formSchema>;

// # Interface til træningsøvelse som kommer fra props
interface TraeningOevelse {
  id: number;
  traeningId: number;
  oevelseId: number;
  position: number;
  oevelse: {
    id: number;
    navn: string;
    beskrivelse: string | null;
    billedeSti: string | null;
    brugerPositioner: boolean;
    minimumDeltagere: number | null;
    kategoriNavn: string | null;
  };
}

// # Props for OevelseRedigerForm komponenten
interface OevelseRedigerFormProps {
  traeningOevelse: TraeningOevelse;
  kategorier: string[];
  fokuspunkter: string[];
  aktuelleOevelseFokuspunkter: string[];
  indlaeserFokuspunkter: boolean;
  onCancel: () => void;
  onSuccess: (opdateretNavn: string, opdateretKategori: string | null, opdateretBeskrivelse: string | null, nyeFokuspunkter?: string[]) => void;
}

// # Komponent til redigering af en lokal træningsøvelse
export function OevelseRedigerForm({ 
  traeningOevelse, 
  kategorier: initialKategorier, 
  fokuspunkter: initialFokuspunkter, 
  aktuelleOevelseFokuspunkter,
  indlaeserFokuspunkter,
  onCancel, 
  onSuccess 
}: OevelseRedigerFormProps) {
  // # State til at holde styr på om vi er ved at indsende formularen
  const [indsender, setIndsender] = useState(false);
  // # State til fokuspunkter
  const [valgteFokuspunkter, setValgteFokuspunkter] = useState<string[]>([]);
  // # State til at vise input for nyt fokuspunkt
  const [visFokuspunktInput, setVisFokuspunktInput] = useState(false);
  // # State til nyt fokuspunkt
  const [nytFokuspunkt, setNytFokuspunkt] = useState('');
  // # State til at vise input for ny kategori
  const [visKategoriInput, setVisKategoriInput] = useState(false);
  // # State til ny kategori
  const [nyKategori, setNyKategori] = useState('');
  // # State til lokale kategorier (inkl. nye)
  const [lokaleKategorier, setLokaleKategorier] = useState<string[]>(initialKategorier);
  // # State til lokale fokuspunkter (inkl. nye)
  const [lokaleFokuspunkter, setLokaleFokuspunkter] = useState<string[]>(initialFokuspunkter);

  // # Opret form med react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: traeningOevelse.oevelse.navn,
      beskrivelse: traeningOevelse.oevelse.beskrivelse || '',
      kategoriNavn: traeningOevelse.oevelse.kategoriNavn || undefined,
      fokuspunkter: [],
    }
  });

  // # Indlæs de aktuelle fokuspunkter når komponenten indlæses eller opdateres
  useEffect(() => {
    if (aktuelleOevelseFokuspunkter.length > 0) {
      setValgteFokuspunkter(aktuelleOevelseFokuspunkter);
    }
  }, [aktuelleOevelseFokuspunkter]);

  // # Håndter formularen når den indsendes
  const onSubmit = async (values: FormValues) => {
    try {
      setIndsender(true);
      
      // # Hvis der er en ny kategori, brug den i stedet for den valgte
      const endeligKategori = nyKategori && nyKategori.trim() !== '' 
        ? nyKategori.trim() 
        : values.kategoriNavn;
      
      // # Opdater de lokale træningsøvelsesdata
      await opdaterLokalTraeningOevelse({
        id: traeningOevelse.id,
        navn: values.navn,
        beskrivelse: values.beskrivelse,
        kategoriNavn: endeligKategori,
        fokuspunkter: valgteFokuspunkter,
      });
      
      // # Vis bekræftelse
      toast.success('Ændringer gemt!');
      
      // # Send opdaterede data tilbage til parent-komponenten
      onSuccess(values.navn, endeligKategori || null, values.beskrivelse || null, valgteFokuspunkter);
    } catch (error) {
      toast.error('Der opstod en fejl ved opdatering af øvelsen');
      console.error('Fejl ved opdatering af øvelse:', error);
    } finally {
      setIndsender(false);
    }
  };

  // # Tilføj et nyt fokuspunkt
  const tilfoejFokuspunkt = () => {
    if (nytFokuspunkt.trim() !== '') {
      const fokuspunktTekst = nytFokuspunkt.trim();
      
      // # Tilføj fokuspunkt til valgte fokuspunkter
      if (!valgteFokuspunkter.includes(fokuspunktTekst)) {
        setValgteFokuspunkter([...valgteFokuspunkter, fokuspunktTekst]);
      }
      
      // # Tilføj fokuspunkt til lokale fokuspunkter, hvis det ikke allerede findes
      if (!lokaleFokuspunkter.includes(fokuspunktTekst)) {
        setLokaleFokuspunkter([...lokaleFokuspunkter, fokuspunktTekst]);
        toast.success(`Nyt fokuspunkt "${fokuspunktTekst}" tilføjet`);
      }
      
      // # Nulstil input
      setNytFokuspunkt('');
      setVisFokuspunktInput(false);
    }
  };

  // # Tilføj en ny kategori
  const tilfoejKategori = () => {
    if (nyKategori.trim() !== '') {
      const kategoriNavn = nyKategori.trim();
      
      // # Opdater formularens værdi
      form.setValue("kategoriNavn", kategoriNavn);
      
      // # Tilføj kategori til lokale kategorier, hvis det ikke allerede findes
      if (!lokaleKategorier.includes(kategoriNavn)) {
        setLokaleKategorier([...lokaleKategorier, kategoriNavn]);
        toast.success(`Ny kategori "${kategoriNavn}" tilføjet`);
      }
      
      // # Nulstil input
      setVisKategoriInput(false);
    }
  };

  // # Fjern et fokuspunkt
  const fjernFokuspunkt = (index: number) => {
    const nyeFokuspunkter = [...valgteFokuspunkter];
    nyeFokuspunkter.splice(index, 1);
    setValgteFokuspunkter(nyeFokuspunkter);
  };

  // # Vælg et fokuspunkt fra dropdown
  const vaelgFokuspunkt = (fokuspunkt: string) => {
    if (!valgteFokuspunkter.includes(fokuspunkt)) {
      setValgteFokuspunkter([...valgteFokuspunkter, fokuspunkt]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="navn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Øvelsens navn</FormLabel>
              <FormControl>
                <Input placeholder="Indtast øvelsens navn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="kategoriNavn"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Kategori</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setVisKategoriInput(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ny kategori
                </Button>
              </div>
              
              {/* Input til ny kategori */}
              {visKategoriInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nyKategori}
                    onChange={(e) => setNyKategori(e.target.value)}
                    placeholder="Indtast ny kategori..."
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="default" 
                    size="sm" 
                    onClick={tilfoejKategori}
                  >
                    Tilføj
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setVisKategoriInput(false);
                      setNyKategori('');
                    }}
                  >
                    Annuller
                  </Button>
                </div>
              ) : (
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg kategori" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lokaleKategorier.map((kategori) => (
                      <SelectItem key={kategori} value={kategori}>
                        {kategori}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="beskrivelse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beskrivelse</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Beskriv øvelsen..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <FormLabel>Fokuspunkter</FormLabel>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => setVisFokuspunktInput(true)}
            >
              Tilføj fokuspunkt
            </Button>
          </div>
          
          {/* Viser indlæsning af fokuspunkter */}
          {indlaeserFokuspunkter && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <p className="text-sm text-muted-foreground">Indlæser fokuspunkter...</p>
            </div>
          )}
          
          {/* Viser liste af valgte fokuspunkter */}
          <div className="flex flex-wrap gap-2 mt-2">
            {valgteFokuspunkter.map((fokuspunkt, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="px-3 py-1 flex items-center gap-1"
              >
                <Tag className="h-3 w-3" />
                {fokuspunkt}
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1 rounded-full" 
                  onClick={() => fjernFokuspunkt(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          
          {/* Input til nyt fokuspunkt */}
          {visFokuspunktInput && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={nytFokuspunkt}
                onChange={(e) => setNytFokuspunkt(e.target.value)}
                placeholder="Tilføj nyt fokuspunkt..."
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="default" 
                size="sm" 
                onClick={tilfoejFokuspunkt}
              >
                Tilføj
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setVisFokuspunktInput(false);
                  setNytFokuspunkt('');
                }}
              >
                Annuller
              </Button>
            </div>
          )}
          
          {/* Eksisterende fokuspunkter dropdown */}
          {!visFokuspunktInput && (
            <Select onValueChange={vaelgFokuspunkt}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg fra eksisterende fokuspunkter" />
              </SelectTrigger>
              <SelectContent>
                {lokaleFokuspunkter
                  .filter(fp => !valgteFokuspunkter.includes(fp))
                  .map((fokuspunkt) => (
                    <SelectItem key={fokuspunkt} value={fokuspunkt}>
                      {fokuspunkt}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex justify-between pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={indsender}
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            Luk
          </Button>
          
          <Button 
            type="submit" 
            disabled={indsender}
          >
            {indsender ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gemmer...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Gem ændringer
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 