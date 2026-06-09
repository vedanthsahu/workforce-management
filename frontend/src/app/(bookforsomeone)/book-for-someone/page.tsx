"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import BookForSomeonePage from "@/features/bookforsomeone/components/BookFormSomePage";


export default function BookForSomeone() {
  return (
    <SidebarProvider>
      <BookForSomeonePage />
    </SidebarProvider>
  );
}