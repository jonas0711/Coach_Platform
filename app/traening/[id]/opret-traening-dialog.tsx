"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "lucide-react";
import { opretTraening } from "@/lib/db/actions";
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
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

// # Valideringsschema for træningsformular
const formSchema = z.object({
  navn: z.string().min(1, {
    message: "Træningsnavn er påkrævet",
  }),
  beskrivelse: z.string().optional(),
  dato: z.date({
    required_error: "Vælg en dato for træningen",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function OpretTraeningDialog({ holdId }: { holdId: number }) {
  // # State til at styre om dialogen er åben eller lukket
  const [open, setOpen] = useState(false);
  // # State til at håndtere indlæsningstilstand
  const [isSubmitting, setIsSubmitting] = useState(false);

  // # Initialiser formularen med react-hook-form og zod-validering
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: "",
      beskrivelse: "",
      dato: new Date(),
    },
  });

  // # Håndterer indsendelse af formularen
  async function onSubmit(values: FormValues) {
    // # Sæt indlæsningstilstand til true
    setIsSubmitting(true);
    
    try {
      // # Forsøg at oprette træningen i databasen
      console.log("Opretter træning:", values);
      await opretTraening(holdId, {
        navn: values.navn,
        beskrivelse: values.beskrivelse,
        dato: values.dato,
      });
      
      // # Vis en succesmeddelelse
      toast.success("Træningen blev oprettet");
      
      // # Nulstil formen og luk dialogen
      form.reset();
      setOpen(false);
    } catch (error) {
      // # Håndtér fejl og vis en fejlmeddelelse
      console.error("Fejl ved oprettelse af træning:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      // # Afslut indlæsningstilstand
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* # Knap til at åbne dialogen */}
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Opret træning
        </Button>
      </DialogTrigger>
      
      {/* # Dialog-indhold */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Opret ny træning</DialogTitle>
          <DialogDescription>
            Opret en ny træningssession for holdet. Udfyld navn, beskrivelse og dato.
          </DialogDescription>
        </DialogHeader>
        
        {/* # Træningsformular */}
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
            
            {/* # Knapper til at afbryde eller oprette */}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 