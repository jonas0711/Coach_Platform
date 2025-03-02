"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Props der kræves for at redigere en øvelse
interface RedigerOevelseKnapProps {
  oevelseId: number;
}

// Komponent der viser en knap til at redigere en øvelse
export function RedigerOevelseKnap({ oevelseId }: RedigerOevelseKnapProps) {
  // Hook til at navigere mellem sider
  const router = useRouter();

  // Håndterer navigation til redigeringssiden
  function handleRedigering() {
    // Sender brugeren til redigeringssiden for den specifikke øvelse
    router.push(`/traening/oevelser/rediger/${oevelseId}`);
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
      onClick={handleRedigering}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  );
} 