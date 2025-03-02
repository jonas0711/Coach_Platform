"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { 
  CalendarIcon, 
  Loader2, 
  Pencil, 
  Save, 
  Trash2, 
  X 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { opdaterTraening, sletTraening } from "@/lib/db/actions";

// # Props for komponenten
interface TraeningDetaljerProps {
  traening: {
    id: number;
    navn: string;
    beskrivelse?: string;
    dato: Date;
    oprettetDato: Date;
    flereTilmeldte: boolean;
    holdId?: number;
  };
}

// # Valideringsschema for formularen
const formSchema = z.object({
  navn: z.string().min(1, {
    message: "Træningsnavn er påkrævet",
  }),
  beskrivelse: z.string().optional(),
  dato: z.date({
    required_error: "Vælg en dato for træningen",
  }),
});

// # Komponent til at redigere træningens detaljer
export function TraeningDetaljer({ traening }: TraeningDetaljerProps) {
  // # State til at håndtere redigeringstilstand
  const [isEditing, setIsEditing] = useState(false);
  // # State til at håndtere indlæsningstilstand
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # State til at håndtere sletningstilstand
  const [isDeleting, setIsDeleting] = useState(false);
  // # Router til navigation
  const router = useRouter();
  
  // # Initialiser formularen med data fra træningen
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: traening.navn,
      beskrivelse: traening.beskrivelse || "",
      dato: new Date(traening.dato),
    },
  });

  // # Håndter indsendelse af formularen
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // # Opdater træning i databasen
      await opdaterTraening(traening.id, {
        navn: values.navn,
        beskrivelse: values.beskrivelse,
        dato: values.dato,
      });
      
      // # Vis succesmeddelelse
      toast.success("Træning blev opdateret");
      
      // # Afslut redigeringstilstand
      setIsEditing(false);
      
      // # Opdater siden
      router.refresh();
    } catch (error) {
      // # Håndter fejl
      console.error("Fejl ved opdatering af træning:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // # Håndter sletning af træning
  async function handleDelete() {
    setIsDeleting(true);
    
    try {
      // # Slet træning fra databasen
      await sletTraening(traening.id);
      
      // # Vis succesmeddelelse
      toast.success("Træning blev slettet");
      
      // # Navigér tilbage til liste over træninger
      router.push("/traening/faelles");
      router.refresh();
    } catch (error) {
      // # Håndter fejl
      console.error("Fejl ved sletning af træning:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Træningsdetaljer</CardTitle>
          <CardDescription className="mt-1.5">
            Grundlæggende information om træningen
          </CardDescription>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rediger
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            <X className="h-4 w-4 mr-2" />
            Annuller
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* # Træningsnavn */}
              <FormField
                control={form.control}
                name="navn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Træningsnavn</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* # Beskrivelse */}
              <FormField
                control={form.control}
                name="beskrivelse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beskrivelse (valgfri)</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-32"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* # Dato */}
              <FormField
                control={form.control}
                name="dato"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Dato</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: da })
                            ) : (
                              <span>Vælg en dato</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* # Gem-knap */}
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Annuller
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
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
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Træningsnavn</h4>
              <p className="text-base">{traening.navn}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold">Beskrivelse</h4>
              <p className="text-base">
                {traening.beskrivelse ? traening.beskrivelse : <span className="text-muted-foreground italic">Ingen beskrivelse</span>}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold">Dato</h4>
              <p className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 opacity-70" />
                {format(new Date(traening.dato), "PPP", { locale: da })}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold">Type</h4>
              <p className="text-base">
                {traening.flereTilmeldte ? "Fælles træning (flere hold)" : "Holdtræning (et hold)"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Oprettet {format(new Date(traening.oprettetDato), "PPP", { locale: da })}
        </div>
        
        {!isEditing && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Slet træning
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Slet træning</DialogTitle>
                <DialogDescription>
                  Er du sikker på, at du vil slette denne træning? 
                  Denne handling kan ikke fortrydes.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Annuller
                  </Button>
                </DialogClose>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sletter...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Ja, slet træning
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
} 