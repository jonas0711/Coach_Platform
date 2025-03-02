"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon, EditIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { opdaterTraening } from "@/lib/db/actions";
import { cn } from "@/lib/utils";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// # Definér validering med zod
const formSchema = z.object({
  navn: z.string().min(1, "Navn er påkrævet"),
  beskrivelse: z.string().optional(),
  dato: z.date({
    required_error: "Vælg venligst en dato",
  }),
});

// # Type for formens data
type FormValues = z.infer<typeof formSchema>;

// # Type for komponentens props
type RedigerTraeningDialogProps = {
  traeningId: number;
  initialData: {
    navn: string;
    beskrivelse: string | null;
    dato: Date;
  };
};

// # Komponent til redigering af en træning
export function RedigerTraeningDialog({ traeningId, initialData }: RedigerTraeningDialogProps) {
  // # State til styring af dialog åben/lukket
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // # Opret form med react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      navn: initialData.navn,
      beskrivelse: initialData.beskrivelse || "",
      dato: new Date(initialData.dato),
    },
  });

  // # Håndter formularindsendelse
  async function onSubmit(values: FormValues) {
    try {
      setLoading(true);

      // # Kald database-action for at opdatere træningen
      await opdaterTraening(traeningId, {
        navn: values.navn,
        beskrivelse: values.beskrivelse || undefined,
        dato: values.dato,
      });

      // # Vis succes-besked og genindlæs siden
      toast.success("Træning blev opdateret");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Fejl ved opdatering af træning:", error);
      toast.error("Der opstod en fejl ved opdatering af træningen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <EditIcon className="h-4 w-4 mr-2" />
          Rediger
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rediger træning</DialogTitle>
          <DialogDescription>
            Opdater detaljer for denne træningssession.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* # Felt for navn */}
            <FormField
              control={form.control}
              name="navn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Navn</FormLabel>
                  <FormControl>
                    <Input placeholder="Indtast navnet på træningen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* # Felt for beskrivelse */}
            <FormField
              control={form.control}
              name="beskrivelse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beskrivelse af træningen (valgfrit)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Du kan tilføje en detaljeret beskrivelse af træningssessionen.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* # Felt for dato */}
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
                        locale={da}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* # Knapper for handlinger */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuller
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Gemmer..." : "Gem ændringer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 