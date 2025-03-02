"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
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
import { CalendarIcon, CheckIcon, ChevronsUpDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { opretTraening } from "@/lib/db/actions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// # Valideringsschema for formularen
const formSchema = z.object({
  navn: z.string().min(1, {
    message: "Træningsnavn er påkrævet",
  }),
  beskrivelse: z.string().optional(),
  dato: z.date({
    required_error: "Vælg en dato for træningen",
  }),
  holdIds: z.array(z.number()).min(1, {
    message: "Vælg mindst ét hold",
  }),
});

type FormValues = z.infer<typeof formSchema>;

// # Props for komponenten
interface OpretFaellesTraeningFormProps {
  hold: Array<{ id: number; navn: string; }>;
}

// # Formular til oprettelse af fælles træning
export function OpretFaellesTraeningForm({ hold }: OpretFaellesTraeningFormProps) {
  // # State til at håndtere indlæsningstilstand
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til navigation efter indsendelse
  const router = useRouter();
  // # Åben/lukket tilstand for holdvælgeren
  const [open, setOpen] = useState(false);
  // # State til at gemme de valgte hold (bruges til UI visning)
  const [selectedHoldIds, setSelectedHoldIds] = useState<number[]>([]);

  // # Initialiser formularen med react-hook-form og zod-validering
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: "",
      beskrivelse: "",
      dato: new Date(),
      holdIds: [],
    },
  });

  // # Håndterer indsendelse af formularen
  async function onSubmit(values: FormValues) {
    // # Sæt indlæsningstilstand til true
    setIsSubmitting(true);
    
    try {
      // # Opretter træningen med de valgte hold
      console.log("Opretter fælles træning:", values);
      
      // # Opretter træning med valgte hold
      const traeningId = await opretTraening({
        navn: values.navn,
        beskrivelse: values.beskrivelse,
        dato: values.dato,
        holdIds: values.holdIds,
      });
      
      // # Vis en succesmeddelelse
      toast.success("Fælles træning blev oprettet");
      
      // # Naviger til siden for fælles træninger
      router.push("/traening/faelles");
      router.refresh();
    } catch (error) {
      // # Håndtér fejl og vis en fejlmeddelelse
      console.error("Fejl ved oprettelse af fælles træning:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      // # Afslut indlæsningstilstand
      setIsSubmitting(false);
    }
  }

  // # Hjælpefunktion til at tjekke om et hold er valgt
  const isHoldSelected = (holdId: number) => selectedHoldIds.includes(holdId);

  // # Hjælpefunktion til at toggle et holds valgte tilstand
  const toggleHold = (holdId: number) => {
    // # Opdater form values
    const currentHoldIds = form.getValues("holdIds");
    
    if (currentHoldIds.includes(holdId)) {
      // # Fjern hold hvis det allerede er valgt
      const updatedHoldIds = currentHoldIds.filter(id => id !== holdId);
      form.setValue("holdIds", updatedHoldIds, { shouldValidate: true });
      setSelectedHoldIds(updatedHoldIds);
    } else {
      // # Tilføj hold hvis det ikke er valgt
      const updatedHoldIds = [...currentHoldIds, holdId];
      form.setValue("holdIds", updatedHoldIds, { shouldValidate: true });
      setSelectedHoldIds(updatedHoldIds);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opret fælles træning</CardTitle>
        <CardDescription>
          Udfyld information om træningen og vælg hvilke hold der skal deltage.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                    <Input placeholder="Angiv navn på træningen" {...field} />
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
                      placeholder="Beskriv træningens formål eller indhold" 
                      className="min-h-24" 
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
            
            {/* # Hold der skal deltage */}
            <FormField
              control={form.control}
              name="holdIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vælg deltagende hold</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className={cn(
                            "w-full justify-between",
                            !field.value.length && "text-muted-foreground"
                          )}
                        >
                          {field.value.length
                            ? `${field.value.length} hold valgt`
                            : "Vælg hold"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Søg efter hold..." />
                        <CommandList>
                          <CommandEmpty>Ingen hold fundet.</CommandEmpty>
                          <CommandGroup>
                            {hold.map((h) => (
                              <CommandItem
                                key={h.id}
                                value={h.navn}
                                onSelect={() => toggleHold(h.id)}
                              >
                                <Checkbox
                                  checked={isHoldSelected(h.id)}
                                  className="mr-2"
                                  onCheckedChange={() => toggleHold(h.id)}
                                />
                                {h.navn}
                                {isHoldSelected(h.id) && (
                                  <CheckIcon className="ml-auto h-4 w-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* # Valgte hold visning */}
            {selectedHoldIds.length > 0 && (
              <div className="border rounded-md p-3">
                <h3 className="text-sm font-medium mb-2">Valgte hold:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedHoldIds.map((holdId) => {
                    const holdInfo = hold.find(h => h.id === holdId);
                    return (
                      <div 
                        key={holdId}
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        <span>{holdInfo?.navn}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-5 w-5 p-0 rounded-full"
                          onClick={() => toggleHold(holdId)}
                        >
                          <span>×</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* # Knapper til at annullere eller oprette */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => router.push("/traening/faelles")}>
                Annuller
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opretter...
                  </>
                ) : (
                  "Opret træning"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 