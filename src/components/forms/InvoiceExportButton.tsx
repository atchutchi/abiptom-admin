"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  mes: string;
}

export default function InvoiceExportButton({ mes }: Props) {
  return (
    <Button
      variant="outline"
      onClick={() => window.open(`/api/invoices/export?mes=${mes}`, "_blank")}
    >
      <Download className="size-4" />
      Exportar Excel
    </Button>
  );
}
