import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

// # Omdirigering til den nye samlede træningsside
// # Da træner- og træningssiden er blevet kombineret, 
// # sendes brugeren automatisk videre til /traening
export default function TraenerPage() {
  // # Omdirigerer brugeren til træningssiden
  redirect("/traening");
  
  // Denne kode vil ikke blive udført på grund af omdirigeringen ovenfor
  return null;
} 