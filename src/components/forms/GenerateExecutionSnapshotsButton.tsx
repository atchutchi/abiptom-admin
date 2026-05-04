"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateExecutionSnapshotsForPeriod } from "@/lib/execution/actions";

export function GenerateExecutionSnapshotsButton({ periodId }: { periodId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await generateExecutionSnapshotsForPeriod(periodId);
          router.refresh();
        });
      }}
    >
      <Camera className="mr-2 h-4 w-4" />
      {pending ? "A gravar..." : "Gerar snapshot execução"}
    </Button>
  );
}
