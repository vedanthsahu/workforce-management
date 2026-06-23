"use client";

import { useParams } from "next/navigation";
import ChangeRolePage from "@/features/users/components/ChangeRolePage";

export default function UserChangeRolePage() {
  const params = useParams<{ userId: string }>();
  return <ChangeRolePage userId={params.userId} />;
}
