import { Suspense } from "react";
import BookForSomeonePage from "@/features/bookforsomeone/components/BookFormSomePage";

export default function BookForSomeone() {
  return (
    <Suspense>
      <BookForSomeonePage />
    </Suspense>
  );
}
