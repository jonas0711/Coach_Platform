"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tilmeldHoldTilTraening } from "@/lib/db/actions";

// # Props for komponenten
interface TilmeldeHoldFormProps {
  traeningId: number;
  alleHold: {
    id: number;
    navn: string;
  }[];
  tilmeldteHold: number[];
}

// # Valideringsschema for formularen
const formSchema = z.object({
  holdIds: z.array(z.number()).min(1, {
    message: "Vælg mindst ét hold",
  }),
});

// # Komponent til at tilmelde hold til en træning
export function TilmeldeHoldForm({
  traeningId,
  alleHold,
  tilmeldteHold,
}: TilmeldeHoldFormProps) {
  // # State for loading status
  const [isSubmitting, setIsSubmitting] = useState(false);
  // # Router til at opdatere siden
  const router = useRouter();

  // # Opsætning af formular
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      holdIds: tilmeldteHold,
    },
  });

  // # Indsendelse af formularen
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // # Send holdIDs til serveren for at opdatere tilmeldinger
      await tilmeldHoldTilTraening(traeningId, values.holdIds);
      
      // # Vis succesmeddelelse
      toast.success("Hold blev tilmeldt træningen");
      
      // # Opdaterer siden for at vise de nye tilmeldinger
      router.refresh();
    } catch (error) {
      // # Håndter fejl
      console.error("Fejl ved tilmelding af hold:", error);
      toast.error(`Der opstod en fejl: ${error instanceof Error ? error.message : "Ukendt fejl"}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tilmeld hold til træningen</CardTitle>
        <CardDescription>
          Vælg hvilke hold der skal deltage i denne træning. Når du tilmelder et hold, 
          vil alle holdets spillere blive gjort tilgængelige for deltagerlisten.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* # Antal tilmeldte hold badge */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Vælg hold</h3>
              <Badge variant="outline">
                {form.getValues("holdIds").length} hold valgt
              </Badge>
            </div>
            
            {/* # Hold checkboxes */}
            <FormField
              control={form.control}
              name="holdIds"
              render={() => (
                <FormItem>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {alleHold.map((hold) => (
                      <FormField
                        key={hold.id}
                        control={form.control}
                        name="holdIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={hold.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(hold.id)}
                                  onCheckedChange={(checked) => {
                                    // # Tjek om holdet skal tilføjes eller fjernes
                                    if (checked) {
                                      // # Tilføj hold til valgte hold
                                      field.onChange([
                                        ...(field.value || []),
                                        hold.id,
                                      ]);
                                    } else {
                                      // # Fjern hold fra valgte hold
                                      field.onChange(
                                        field.value?.filter(
                                          (value) => value !== hold.id
                                        ) || []
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {hold.navn}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gemmer...
                </>
              ) : (
                "Gem tilmeldinger"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 