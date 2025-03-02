"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { opretFaellesTraening } from "@/lib/db/actions";

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

type FormValues = z.infer<typeof formSchema>;

// # Type defintion for props
type OpretFaellesTraeningButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

// # OpretFaellesTraeningButton komponent
export function OpretFaellesTraeningButton({ variant = "outline", ...props }: OpretFaellesTraeningButtonProps) {
  // # State til at styre dialog åben/lukket
  const [open, setOpen] = useState(false);
  // # State til at styre loading status
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til navigation
  const router = useRouter();

  // # Opsætning af formular
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: "",
      beskrivelse: "",
      dato: new Date(),
    },
  });

  // # Håndtering af formular-indsendelse
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      // # Opret træning i databasen
      const traeningId = await opretFaellesTraening({
        navn: values.navn,
        beskrivelse: values.beskrivelse,
        dato: values.dato,
      });
      
      // # Vis succesmeddelelse
      toast.success("Fælles træning blev oprettet");
      
      // # Luk dialogen
      setOpen(false);
      
      // # Nulstil formularen
      form.reset();
      
      // # Navigér til den nye træningsside
      router.push(`/traening/faelles/${traeningId}`);
    } catch (error) {
      // # Håndter fejl
      console.error("Fejl ved oprettelse af træning:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} {...props}>
          <Plus className="mr-2 h-4 w-4" />
          Opret fælles træning
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Opret fælles træning</DialogTitle>
          <DialogDescription>
            Opret en ny fælles træning. Du kan senere tilføje hold og spillere.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* # Træningsnavn */}
            <FormField
              control={form.control}
              name="navn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Træningsnavn</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="F.eks. 'Fællestræning U13-U15'" />
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
                      {...field} 
                      placeholder="Skriv evt. en kort beskrivelse af træningen"
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
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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