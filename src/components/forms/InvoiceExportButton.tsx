"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  query: string;
}

export default function InvoiceExportButton({ query }: Props) {
  return (
    <Button
      variant="outline"
      onClick={() => window.open(`/api/invoices/export?${query}`, "_blank")}
    >
      <Download className="size-4" />
      Exportar Excel
    </Button>
  );
}
